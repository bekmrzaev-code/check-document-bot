import { Telegraf, Context } from 'telegraf';
import { Message } from 'telegraf/types';
import axios from 'axios';
import { driverService } from '../services/driver.service';
import { uploadService } from '../services/upload.service';
import { approvedImageService } from '../services/approved-image.service';

interface BotContext extends Context {
  session?: any;
}

export class TelegramBot {
  private bot: Telegraf<BotContext>;
  private imageBuffer: Map<string, { images: string[]; groupName: string; userId: number; senderName: string }>;

  constructor(token: string) {
    this.bot = new Telegraf<BotContext>(token);
    this.imageBuffer = new Map();
    this.setupHandlers();
  }

  private setupHandlers(): void {
    // Listen to photos in groups
    this.bot.on('photo', async (ctx) => {
      try {
        if (ctx.message.chat.type !== 'group' && ctx.message.chat.type !== 'supergroup') {
          return;
        }

        const photo = ctx.message.photo[ctx.message.photo.length - 1]; // Get highest quality
        const groupName = ctx.message.chat.title || 'Unknown Group';
        const userId = ctx.message.from.id;
        const senderName = ctx.message.from.first_name || 'Unknown';

        const bufferKey = `${userId}-${ctx.message.chat.id}`;
        if (!this.imageBuffer.has(bufferKey)) {
          this.imageBuffer.set(bufferKey, {
            images: [],
            groupName,
            userId,
            senderName,
          });
        }

        const buffer = this.imageBuffer.get(bufferKey)!;
        buffer.images.push(photo.file_id);

        // Acknowledge to driver (silent)
        // Auto-flush after 5 seconds of inactivity
        if (buffer.images.length === 1) {
          setTimeout(() => {
            this.flushImages(bufferKey);
          }, 5000);
        }
      } catch (error) {
        console.error('Error handling photo:', error);
      }
    });

    // Admin commands
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
        const webAppUrl = `${process.env.ADMIN_URL || 'http://localhost:3001'}/admin/dashboard.html`;
        await ctx.reply('Opening Admin Dashboard...', {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '🔐 Admin Panel',
                  web_app: { url: webAppUrl }
                }
              ]
            ]
          }
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
      // Create or get driver
      const driver = await driverService.getOrCreate(
        buffer.userId,
        buffer.senderName
      );

      // Create upload record
      const upload = await uploadService.create(
        driver.id,
        buffer.groupName,
        buffer.images.length
      );

      // Store file_ids in the upload record so pending images are accessible after restart
      await uploadService.updateFileIds(upload.id, buffer.images);

      // Send admin notification
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
${process.env.ADMIN_URL || 'http://localhost:3000'}/admin?upload=${upload.id}
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

  async uploadToPrivateChannel(
    fileIds: string[],
    channelId: string
  ): Promise<number[]> {
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

  async sendPhoto(chatId: number, fileId: string): Promise<void> {
    try {
      await this.bot.telegram.sendPhoto(chatId, fileId);
    } catch (error) {
      console.error('Error sending photo:', error);
      throw error;
    }
  }

  start(): void {
    this.bot.launch();
    console.log('🤖 Telegram bot started');
  }

  stop(): void {
    this.bot.stop();
  }
}

export let telegramBot: TelegramBot;

export function initTelegramBot(token: string): TelegramBot {
  telegramBot = new TelegramBot(token);
  telegramBot.start();
  return telegramBot;
}
