import { Telegraf, Context } from 'telegraf';
import { Chat } from 'telegraf/types';
import { driverService } from '../services/driver.service';
import { uploadService } from '../services/upload.service';
import { groupService } from '../services/group.service';

function getAppUrl(): string {
  return (
    process.env.ADMIN_URL ||
    process.env.APP_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    `http://localhost:${process.env.PORT || 3000}`
  );
}

const ACTIVE_BOT_STATUSES = new Set(['member', 'administrator', 'creator', 'restricted']);

interface BotContext extends Context {
  session?: any;
}

interface ImageBuffer {
  images: string[];
  groupName: string;
  groupId: number;
  userId: number;
  senderName: string;
}

export class TelegramBot {
  private bot: Telegraf<BotContext>;
  private imageBuffer: Map<string, ImageBuffer>;
  private botUserId: number | null = null;

  constructor(token: string) {
    this.bot = new Telegraf<BotContext>(token);
    this.imageBuffer = new Map();
    this.setupHandlers();
  }

  private async registerGroupChat(
    chat: Chat.GroupChat | Chat.SupergroupChat,
    options: { fetchCount?: boolean; log?: boolean } = {}
  ): Promise<void> {
    const { fetchCount = true, log = true } = options;

    // Only hit the Telegram API for member count when explicitly asked
    // (e.g. on add / sync). On every incoming message we keep the existing
    // count to avoid an API call + rate limits per message.
    let memberCount: number | undefined;
    if (fetchCount) {
      try {
        memberCount = await this.bot.telegram.getChatMembersCount(chat.id);
      } catch {
        // Bot may lack permission to read member count
      }
    }

    await groupService.register({
      group_id: chat.id,
      group_name: chat.title || 'Unknown Group',
      group_type: chat.type,
      member_count: memberCount,
    });

    if (log) console.log(`[Groups] Registered: ${chat.title} (${chat.id})`);
  }

  private setupHandlers(): void {
    // Catch ALL group activity (text, commands, photos, etc.)
    this.bot.use(async (ctx, next) => {
      const chat = ctx.chat;
      if (chat && (chat.type === 'group' || chat.type === 'supergroup')) {
        try {
          // lightweight: no per-message API call, no log spam
          await this.registerGroupChat(chat, { fetchCount: false, log: false });
        } catch (error) {
          console.error('[Groups] Middleware register error:', error);
        }
      }
      return next();
    });

    // Bot added/removed from groups
    this.bot.on('my_chat_member', async (ctx) => {
      try {
        const update = ctx.update.my_chat_member;
        const chat = update.chat;
        if (chat.type !== 'group' && chat.type !== 'supergroup') {
          return;
        }

        const status = update.new_chat_member.status;
        console.log(`[Groups] my_chat_member: ${chat.title} → ${status}`);

        if (ACTIVE_BOT_STATUSES.has(status)) {
          await this.registerGroupChat(chat);
        } else if (status === 'left' || status === 'kicked') {
          await groupService.markInactive(chat.id);
          console.log(`[Groups] Marked inactive: ${chat.title}`);
        }
      } catch (error) {
        console.error('Error handling my_chat_member:', error);
      }
    });

    // Legacy: bot added via new_chat_members event
    this.bot.on('new_chat_members', async (ctx) => {
      try {
        const chat = ctx.chat;
        if (chat.type !== 'group' && chat.type !== 'supergroup') {
          return;
        }

        const members = ctx.message.new_chat_members || [];
        const botWasAdded = this.botUserId
          ? members.some((m) => m.id === this.botUserId)
          : members.some((m) => m.is_bot);

        if (botWasAdded) {
          await this.registerGroupChat(chat);
          console.log(`[Groups] Bot added to: ${chat.title}`);
        }
      } catch (error) {
        console.error('Error handling new_chat_members:', error);
      }
    });

    // Photos in groups
    this.bot.on('photo', async (ctx) => {
      try {
        if (ctx.message.chat.type !== 'group' && ctx.message.chat.type !== 'supergroup') {
          return;
        }

        const photo = ctx.message.photo[ctx.message.photo.length - 1];
        const groupName = ctx.message.chat.title || 'Unknown Group';
        const groupId = ctx.message.chat.id;
        const userId = ctx.message.from.id;
        const senderName = ctx.message.from.first_name || 'Unknown';

        const bufferKey = `${userId}-${groupId}`;
        if (!this.imageBuffer.has(bufferKey)) {
          this.imageBuffer.set(bufferKey, {
            images: [],
            groupName,
            groupId,
            userId,
            senderName,
          });
        }

        const buffer = this.imageBuffer.get(bufferKey)!;
        buffer.images.push(photo.file_id);

        if (buffer.images.length === 1) {
          setTimeout(() => {
            this.flushImages(bufferKey);
          }, 5000);
        }
      } catch (error) {
        console.error('Error handling photo:', error);
      }
    });

    this.bot.command('start', async (ctx) => {
      try {
        await ctx.reply(
          'Driver Approval Bot started. Send images in the group for approval.'
        );
      } catch (error) {
        console.error('Error in start command:', error);
      }
    });

    this.bot.command('status', async (ctx) => {
      try {
        const userId = ctx.message?.from?.id;
        if (!userId) {
          await ctx.reply('Unable to identify user');
          return;
        }

        const driver = await driverService.getByTelegramId(userId);

        if (!driver) {
          await ctx.reply('You are not registered. Please send images in the group first.');
          return;
        }

        const statusMap: { [key: string]: string } = {
          pending: '⏳',
          approved: '✅',
          rejected: '❌',
        };

        const statusEmoji = statusMap[driver.status] || '❓';

        await ctx.reply(
          `Your Status: ${statusEmoji} ${driver.status}\n` +
          `Company: ${driver.company_id ? 'Assigned' : 'Not assigned'}\n` +
          `Telegram ID: ${driver.telegram_user_id}`
        );
      } catch (error) {
        console.error('Error in status command:', error);
        await ctx.reply('Error fetching status');
      }
    });

    this.bot.command('admin', async (ctx) => {
      try {
        const webAppUrl = `${getAppUrl()}/admin`;
        await ctx.reply('Opening Admin Dashboard...', {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '🔐 Admin Panel',
                  web_app: { url: webAppUrl },
                },
              ],
            ],
          },
        });
      } catch (error) {
        console.error('Error in admin command:', error);
      }
    });
  }

  private async flushImages(bufferKey: string): Promise<void> {
    const buffer = this.imageBuffer.get(bufferKey);
    if (!buffer || buffer.images.length === 0) {
      return;
    }

    try {
      const driver = await driverService.getOrCreate(buffer.userId, buffer.senderName);

      const upload = await uploadService.create(
        driver.id,
        buffer.groupName,
        buffer.images.length,
        undefined,
        buffer.groupId
      );

      await uploadService.updateFileIds(upload.id, buffer.images);

      const adminChatId = process.env.ADMIN_CHAT_ID;
      if (adminChatId && this.bot) {
        const message = `
📸 New Upload Notification

👤 Driver: ${driver.name}
📱 Telegram ID: ${driver.telegram_user_id}
📍 Group: ${buffer.groupName}
🖼️ Images: ${buffer.images.length}
📊 Status: PENDING ⏳

Upload ID: \`${upload.id}\`

Click the link below to review:
${getAppUrl()}/admin?upload=${upload.id}
        `;

        await this.bot.telegram.sendMessage(adminChatId, message, {
          parse_mode: 'Markdown',
        });
      }

      console.log(`✅ Upload created: ${upload.id} with ${buffer.images.length} images`);
    } catch (error) {
      console.error('Error flushing images:', error);
    }

    this.imageBuffer.delete(bufferKey);
  }

  async refreshAllGroups(): Promise<{ refreshed: number; failed: number; deactivated: number }> {
    const groups = await groupService.getAll();
    let refreshed = 0;
    let failed = 0;
    let deactivated = 0;

    for (const group of groups) {
      try {
        const chat = await this.bot.telegram.getChat(group.group_id);
        if (chat.type !== 'group' && chat.type !== 'supergroup') {
          continue;
        }

        // Confirm the bot is still a member (don't deactivate on transient errors)
        let stillMember = true;
        if (this.botUserId) {
          try {
            const me = await this.bot.telegram.getChatMember(group.group_id, this.botUserId);
            stillMember = ACTIVE_BOT_STATUSES.has(me.status);
          } catch {
            // can't verify membership → leave current state untouched
          }
        }

        let memberCount = group.member_count;
        try {
          memberCount = await this.bot.telegram.getChatMembersCount(group.group_id);
        } catch {
          // keep existing count
        }

        await groupService.register({
          group_id: group.group_id,
          group_name: chat.title || group.group_name,
          group_type: chat.type,
          member_count: memberCount,
        });

        if (!stillMember) {
          await groupService.markInactive(group.group_id);
          deactivated++;
        }
        refreshed++;
      } catch (error: any) {
        // Only deactivate when Telegram confirms the bot has no access
        // (kicked / removed / chat deleted). Keep the group on transient errors.
        const code = error?.response?.error_code;
        if (code === 403 || code === 400) {
          await groupService.markInactive(group.group_id);
          deactivated++;
        }
        failed++;
      }
    }

    return { refreshed, failed, deactivated };
  }

  async uploadToPrivateChannel(fileIds: string[], channelId: string): Promise<number[]> {
    const messageIds: number[] = [];

    try {
      for (const fileId of fileIds) {
        const result = await this.bot.telegram.sendPhoto(channelId, fileId);
        if (result && 'message_id' in result) {
          messageIds.push(result.message_id);
        }
      }
    } catch (error) {
      console.error('Error uploading to private channel:', error);
    }

    return messageIds;
  }

  async getFileLink(fileId: string): Promise<string | null> {
    try {
      const file = await this.bot.telegram.getFile(fileId);
      if (!file || !file.file_path) {
        return null;
      }

      return `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;
    } catch (error) {
      console.error('Error getting file link:', error);
      return null;
    }
  }

  async sendAdminNotification(message: string): Promise<void> {
    const adminChatId = process.env.ADMIN_CHAT_ID;
    if (adminChatId) {
      await this.bot.telegram.sendMessage(adminChatId, message, {
        parse_mode: 'Markdown',
      });
    }
  }

  async sendMessage(chatId: number, message: string, options?: any): Promise<void> {
    try {
      await this.bot.telegram.sendMessage(chatId, message, options || {});
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async sendPhoto(chatId: number, fileId: string): Promise<{ message_id: number } | null> {
    try {
      const result = await this.bot.telegram.sendPhoto(chatId, fileId);
      return result && 'message_id' in result ? { message_id: result.message_id } : null;
    } catch (error) {
      console.error('Error sending photo:', error);
      throw error;
    }
  }

  // Send a photo with an optional caption. `photo` is either an uploaded
  // buffer ({ source }) or a Telegram file_id string (reuse after first send,
  // so broadcasting an image to many groups uploads it only once).
  async sendPhotoWithCaption(
    chatId: number,
    photo: { source: Buffer } | string,
    caption?: string
  ): Promise<{ message_id: number; file_id?: string }> {
    const opts = caption ? { caption, parse_mode: 'Markdown' as const } : {};
    const result: any = await this.bot.telegram.sendPhoto(chatId, photo as any, opts);
    const sizes: Array<{ file_id: string }> | undefined = result?.photo;
    const file_id = sizes && sizes.length ? sizes[sizes.length - 1].file_id : undefined;
    return { message_id: result.message_id, file_id };
  }

  // Send one or more photos with an optional caption (on the first photo).
  // Multiple photos go as an album (sendMediaGroup). Each source is a buffer
  // ({ source }) or a file_id string. Returns the largest file_id per photo
  // so callers can reuse them for the next group (upload once per broadcast).
  async sendPhotosWithCaption(
    chatId: number,
    photos: Array<{ source: Buffer } | string>,
    caption?: string
  ): Promise<{ file_ids: string[] }> {
    if (photos.length <= 1) {
      const r = await this.sendPhotoWithCaption(chatId, photos[0], caption);
      return { file_ids: r.file_id ? [r.file_id] : [] };
    }
    const media = photos.slice(0, 10).map((p, i) => ({
      type: 'photo' as const,
      media: p as any,
      ...(i === 0 && caption ? { caption, parse_mode: 'Markdown' as const } : {}),
    }));
    const results: any[] = await this.bot.telegram.sendMediaGroup(chatId, media as any);
    const file_ids = results
      .map((r) => {
        const sizes: Array<{ file_id: string }> | undefined = r?.photo;
        return sizes && sizes.length ? sizes[sizes.length - 1].file_id : undefined;
      })
      .filter((x): x is string => !!x);
    return { file_ids };
  }

  async start(): Promise<void> {
    const me = await this.bot.telegram.getMe();
    this.botUserId = me.id;
    console.log(`🤖 Bot identity: @${me.username} (${me.id})`);

    // IMPORTANT: with long polling, bot.launch() only resolves when the bot
    // STOPS. Awaiting it here would block start() forever, so the caller
    // (initTelegramBot) would never return and the Express server in index.ts
    // would never start. Fire it without awaiting and surface launch errors.
    void this.bot
      .launch({
        allowedUpdates: [
          'message',
          'edited_message',
          'my_chat_member',
          'chat_member',
          'channel_post',
        ],
      })
      .catch((error) => {
        console.error('Telegram bot launch failed:', error);
      });

    console.log('🤖 Telegram bot started (listening for group events)');
    console.log(
      '💡 Tip: Disable privacy mode in @BotFather (/setprivacy → Disable) so the bot receives all group messages'
    );
  }

  stop(): void {
    this.bot.stop();
  }
}

export let telegramBot: TelegramBot;

export async function initTelegramBot(token: string): Promise<TelegramBot> {
  telegramBot = new TelegramBot(token);
  await telegramBot.start();

  const uploadGroups = await uploadService.getDistinctGroups();
  const synced = await groupService.syncFromUploads(uploadGroups);
  if (synced > 0) {
    console.log(`[Groups] Synced ${synced} group(s) from upload history`);
  }

  return telegramBot;
}
