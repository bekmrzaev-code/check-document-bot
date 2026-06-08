import { scheduledMessageService, ScheduledMessage } from './services/scheduled-message.service';
import { groupService } from './services/group.service';
import { telegramBot } from './bot/telegram';

let timer: NodeJS.Timeout | null = null;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

// Local-time "HH:MM" and "YYYY-MM-DD"
function nowHHMM(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function localDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function resolveTargets(schedule: ScheduledMessage): Promise<number[]> {
  if (schedule.target === 'all') {
    const groups = await groupService.getAll();
    return groups.filter((g) => g.is_active).map((g) => g.group_id);
  }
  return schedule.target;
}

async function sendSchedule(schedule: ScheduledMessage): Promise<void> {
  if (!telegramBot) {
    console.warn('[Scheduler] Bot not ready, skipping schedule', schedule.id);
    return;
  }
  const targets = await resolveTargets(schedule);
  let sent = 0;
  let failed = 0;

  for (const groupId of targets) {
    try {
      await telegramBot.sendMessage(groupId, schedule.text, { parse_mode: 'Markdown' });
      await groupService.touch(groupId);
      sent++;
    } catch (error: any) {
      failed++;
      if (error?.response?.error_code === 403) {
        await groupService.markInactive(groupId);
      }
    }
  }

  console.log(
    `[Scheduler] Sent daily message "${schedule.id}" at ${schedule.time_of_day} → ${sent} ok, ${failed} failed`
  );
}

async function tick(): Promise<void> {
  try {
    const now = new Date();
    const hhmm = nowHHMM(now);
    const today = localDate(now);

    const schedules = await scheduledMessageService.getActive();
    for (const schedule of schedules) {
      if (schedule.time_of_day !== hhmm) continue;   // fire only at the chosen minute
      if (schedule.last_run_date === today) continue; // already sent today
      // mark first so a slow send can't trigger a duplicate on the next tick
      await scheduledMessageService.markRun(schedule.id, today);
      await sendSchedule(schedule);
    }
  } catch (error) {
    console.error('[Scheduler] tick error:', error);
  }
}

export function startScheduler(): void {
  if (timer) return;
  // poll every 30s so we never miss the target minute
  timer = setInterval(tick, 30_000);
  // run once shortly after boot too
  setTimeout(tick, 2_000);
  console.log('⏰ Daily message scheduler started');
}

export function stopScheduler(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
