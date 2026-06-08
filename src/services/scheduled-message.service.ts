import { v4 as uuidv4 } from 'uuid';
import { db } from '../storage/database';

export interface ScheduledMessage {
  id: string;
  text: string;
  time_of_day: string;          // "HH:MM" 24h, server local time
  target: 'all' | number[];      // "all" active groups, or explicit group ids
  is_active: boolean;
  last_run_date: string | null;  // "YYYY-MM-DD"
  created_at: string;
}

function rowToSchedule(row: any): ScheduledMessage {
  let target: 'all' | number[] = 'all';
  if (row.target && row.target !== 'all') {
    try {
      const parsed = JSON.parse(row.target);
      target = Array.isArray(parsed) ? parsed : 'all';
    } catch {
      target = 'all';
    }
  }
  return {
    id: row.id,
    text: row.text,
    time_of_day: row.time_of_day,
    target,
    is_active: Boolean(row.is_active),
    last_run_date: row.last_run_date ?? null,
    created_at: row.created_at,
  };
}

export class ScheduledMessageService {
  async create(data: {
    text: string;
    time_of_day: string;
    target: 'all' | number[];
  }): Promise<ScheduledMessage> {
    const id = uuidv4();
    const now = new Date().toISOString();
    const targetValue = data.target === 'all' ? 'all' : JSON.stringify(data.target);

    await db.run(
      `INSERT INTO scheduled_messages (id, text, time_of_day, target, is_active, last_run_date, created_at)
       VALUES (?, ?, ?, ?, 1, NULL, ?)`,
      [id, data.text, data.time_of_day, targetValue, now]
    );

    return (await this.getById(id))!;
  }

  async getById(id: string): Promise<ScheduledMessage | undefined> {
    const row = await db.get<any>('SELECT * FROM scheduled_messages WHERE id = ?', [id]);
    return row ? rowToSchedule(row) : undefined;
  }

  async getAll(): Promise<ScheduledMessage[]> {
    const rows = await db.all<any>('SELECT * FROM scheduled_messages ORDER BY time_of_day ASC');
    return rows.map(rowToSchedule);
  }

  async getActive(): Promise<ScheduledMessage[]> {
    const rows = await db.all<any>('SELECT * FROM scheduled_messages WHERE is_active = 1');
    return rows.map(rowToSchedule);
  }

  async setActive(id: string, active: boolean): Promise<void> {
    await db.run('UPDATE scheduled_messages SET is_active = ? WHERE id = ?', [active ? 1 : 0, id]);
  }

  async markRun(id: string, date: string): Promise<void> {
    await db.run('UPDATE scheduled_messages SET last_run_date = ? WHERE id = ?', [date, id]);
  }

  async delete(id: string): Promise<void> {
    await db.run('DELETE FROM scheduled_messages WHERE id = ?', [id]);
  }
}

export const scheduledMessageService = new ScheduledMessageService();
