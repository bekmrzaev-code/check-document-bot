import { db } from '../storage/database';
import { Driver } from '../types';

export interface GroupDriverCounts {
  approved: number;
  pending: number;
  rejected: number;
  total: number;
}

export interface TelegramGroup {
  group_id: number;
  group_name: string;            // original Telegram title (shown small)
  admin_name?: string | null;    // admin's clarifying label (shown large)
  company_id?: string | null;    // optional company this group belongs to
  group_type: 'group' | 'supergroup' | 'channel';
  member_count: number;
  is_active: boolean;
  added_at: string;
  last_seen: string;
}

function rowToGroup(row: any): TelegramGroup {
  return {
    group_id: row.group_id,
    group_name: row.group_name,
    admin_name: row.admin_name ?? null,
    company_id: row.company_id ?? null,
    group_type: row.group_type,
    member_count: row.member_count ?? 0,
    is_active: Boolean(row.is_active),
    added_at: row.added_at,
    last_seen: row.last_seen,
  };
}

export class GroupService {
  async register(data: {
    group_id: number;
    group_name: string;
    group_type?: 'group' | 'supergroup' | 'channel';
    member_count?: number;
  }): Promise<TelegramGroup> {
    const existing = await db.get<any>(
      'SELECT * FROM telegram_groups WHERE group_id = ?',
      [data.group_id]
    );
    const now = new Date().toISOString();

    if (existing) {
      await db.run(
        `UPDATE telegram_groups
         SET group_name = ?, group_type = ?, member_count = ?, is_active = 1, last_seen = ?
         WHERE group_id = ?`,
        [
          data.group_name,
          data.group_type ?? existing.group_type,
          data.member_count ?? existing.member_count ?? 0,
          now,
          data.group_id,
        ]
      );
    } else {
      await db.run(
        `INSERT INTO telegram_groups
         (group_id, group_name, group_type, member_count, is_active, added_at, last_seen)
         VALUES (?, ?, ?, ?, 1, ?, ?)`,
        [
          data.group_id,
          data.group_name,
          data.group_type ?? 'group',
          data.member_count ?? 0,
          now,
          now,
        ]
      );
    }

    return (await this.getById(data.group_id))!;
  }

  async getById(group_id: number): Promise<TelegramGroup | undefined> {
    const row = await db.get<any>(
      'SELECT * FROM telegram_groups WHERE group_id = ?',
      [group_id]
    );
    return row ? rowToGroup(row) : undefined;
  }

  async getAll(): Promise<TelegramGroup[]> {
    const rows = await db.all<any>(
      'SELECT * FROM telegram_groups ORDER BY last_seen DESC'
    );
    return rows.map(rowToGroup);
  }

  async setAdminName(group_id: number, admin_name: string | null): Promise<void> {
    await db.run(
      'UPDATE telegram_groups SET admin_name = ? WHERE group_id = ?',
      [admin_name && admin_name.trim() ? admin_name.trim() : null, group_id]
    );
  }

  async setCompany(group_id: number, company_id: string | null): Promise<void> {
    await db.run(
      'UPDATE telegram_groups SET company_id = ? WHERE group_id = ?',
      [company_id && company_id.trim() ? company_id.trim() : null, group_id]
    );
  }

  async getByCompany(company_id: string): Promise<TelegramGroup[]> {
    const rows = await db.all<any>(
      'SELECT * FROM telegram_groups WHERE company_id = ? ORDER BY last_seen DESC',
      [company_id]
    );
    return rows.map(rowToGroup);
  }

  async markInactive(group_id: number): Promise<void> {
    const now = new Date().toISOString();
    await db.run(
      'UPDATE telegram_groups SET is_active = 0, last_seen = ? WHERE group_id = ?',
      [now, group_id]
    );
  }

  async touch(group_id: number): Promise<void> {
    const now = new Date().toISOString();
    await db.run(
      'UPDATE telegram_groups SET last_seen = ? WHERE group_id = ?',
      [now, group_id]
    );
  }

  async delete(group_id: number): Promise<void> {
    await db.run('DELETE FROM telegram_groups WHERE group_id = ?', [group_id]);
  }

  async syncFromUploads(
    rows: Array<{ group_id: number; group_name: string }>
  ): Promise<number> {
    let synced = 0;
    for (const row of rows) {
      if (!row.group_id) continue;
      await this.register({
        group_id: row.group_id,
        group_name: row.group_name || `Group ${row.group_id}`,
        group_type: 'supergroup',
      });
      synced++;
    }
    return synced;
  }

  // Distinct drivers that have ever uploaded in a given group (linked via uploads.group_id)
  async getDriversByGroup(group_id: number): Promise<Driver[]> {
    return db.all<Driver>(
      `SELECT DISTINCT d.* FROM drivers d
       JOIN uploads u ON u.driver_id = d.id
       WHERE u.group_id = ?
       ORDER BY d.created_at DESC`,
      [group_id]
    );
  }

  // Per-group driver counts split by status (approved / pending / rejected)
  async getDriverStatusCounts(): Promise<Record<number, GroupDriverCounts>> {
    const rows = await db.all<{ group_id: number; status: string; cnt: number }>(
      `SELECT u.group_id AS group_id, d.status AS status, COUNT(DISTINCT d.id) AS cnt
       FROM uploads u
       JOIN drivers d ON d.id = u.driver_id
       WHERE u.group_id IS NOT NULL
       GROUP BY u.group_id, d.status`
    );
    const map: Record<number, GroupDriverCounts> = {};
    for (const r of rows) {
      if (!map[r.group_id]) map[r.group_id] = { approved: 0, pending: 0, rejected: 0, total: 0 };
      if (r.status === 'approved') map[r.group_id].approved = r.cnt;
      else if (r.status === 'rejected') map[r.group_id].rejected = r.cnt;
      else map[r.group_id].pending = r.cnt;
      map[r.group_id].total += r.cnt;
    }
    return map;
  }

  async getStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    total_members: number;
  }> {
    const all = await this.getAll();
    const active = all.filter((g) => g.is_active);
    return {
      total: all.length,
      active: active.length,
      inactive: all.length - active.length,
      total_members: active.reduce((sum, g) => sum + (g.member_count || 0), 0),
    };
  }
}

export const groupService = new GroupService();
