import { v4 as uuidv4 } from 'uuid';
import { db } from '../storage/database';
import { Driver, DriverStatus } from '../types';

export class DriverService {
  async getOrCreate(
    telegram_user_id: number,
    name: string
  ): Promise<Driver> {
    const existing = await db.get<Driver>(
      'SELECT * FROM drivers WHERE telegram_user_id = ?',
      [telegram_user_id]
    );

    if (existing) {
      return existing;
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO drivers (id, telegram_user_id, name, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, telegram_user_id, name, 'pending', now, now]
    );

    return {
      id,
      telegram_user_id,
      name,
      status: 'pending',
      company_id: null,
      created_at: now,
      updated_at: now,
    };
  }

  async getById(id: string): Promise<Driver | undefined> {
    return db.get<Driver>('SELECT * FROM drivers WHERE id = ?', [id]);
  }

  async getByTelegramId(telegram_user_id: number): Promise<Driver | undefined> {
    return db.get<Driver>(
      'SELECT * FROM drivers WHERE telegram_user_id = ?',
      [telegram_user_id]
    );
  }

  async getAllApproved(): Promise<Driver[]> {
    return db.all<Driver>(
      'SELECT * FROM drivers WHERE status = ?',
      ['approved']
    );
  }

  async searchByName(query: string): Promise<Driver[]> {
    return db.all<Driver>(
      `SELECT * FROM drivers WHERE status = 'approved' AND name LIKE ? LIMIT 50`,
      [`%${query}%`]
    );
  }

  async updateStatus(id: string, status: DriverStatus): Promise<void> {
    const now = new Date().toISOString();
    await db.run(
      'UPDATE drivers SET status = ?, updated_at = ? WHERE id = ?',
      [status, now, id]
    );
  }

  async assignToCompany(driver_id: string, company_id: string): Promise<void> {
    const now = new Date().toISOString();
    await db.run(
      'UPDATE drivers SET company_id = ?, updated_at = ? WHERE id = ?',
      [company_id, now, driver_id]
    );
  }

  async getByCompany(company_id: string): Promise<Driver[]> {
    return db.all<Driver>(
      'SELECT * FROM drivers WHERE company_id = ? ORDER BY name',
      [company_id]
    );
  }
}

export const driverService = new DriverService();
