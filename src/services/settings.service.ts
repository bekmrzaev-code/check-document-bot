import { db } from '../storage/database';

export class SettingsService {
  async set(key: string, value: string): Promise<void> {
    const existing = await db.get<{ key: string; value: string }>(
      'SELECT * FROM settings WHERE key = ?',
      [key]
    );

    if (existing) {
      await db.run('UPDATE settings SET value = ? WHERE key = ?', [value, key]);
    } else {
      await db.run('INSERT INTO settings (key, value) VALUES (?, ?)', [key, value]);
    }
  }

  async get(key: string): Promise<string | null> {
    const result = await db.get<{ key: string; value: string }>(
      'SELECT value FROM settings WHERE key = ?',
      [key]
    );
    return result ? result.value : null;
  }

  async delete(key: string): Promise<void> {
    await db.run('DELETE FROM settings WHERE key = ?', [key]);
  }

  async getAll(): Promise<Record<string, string>> {
    const rows = await db.all<{ key: string; value: string }>(
      'SELECT key, value FROM settings'
    );
    const result: Record<string, string> = {};
    rows.forEach(row => {
      result[row.key] = row.value;
    });
    return result;
  }
}

export const settingsService = new SettingsService();
