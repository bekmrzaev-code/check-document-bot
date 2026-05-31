import { v4 as uuidv4 } from 'uuid';
import { db } from '../storage/database';
import { Upload, UploadStatus } from '../types';

export class UploadService {
  async create(
    driver_id: string,
    group_name: string,
    image_count: number,
    file_ids?: string[]
  ): Promise<Upload> {
    const id = uuidv4();
    const now = new Date().toISOString();
    const fileIdsJson = file_ids ? JSON.stringify(file_ids) : null;

    await db.run(
      `INSERT INTO uploads (id, driver_id, group_name, status, image_count, file_ids, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, driver_id, group_name, 'pending', image_count, fileIdsJson, now, now]
    );

    return {
      id,
      driver_id,
      group_name,
      status: 'pending',
      image_count,
      created_at: now,
      updated_at: now,
    };
  }

  async getById(id: string): Promise<Upload | undefined> {
    return db.get<Upload>('SELECT * FROM uploads WHERE id = ?', [id]);
  }

  async getPending(): Promise<Upload[]> {
    return db.all<Upload>(
      `SELECT u.*, d.name as driver_name, d.telegram_user_id 
       FROM uploads u 
       JOIN drivers d ON u.driver_id = d.id 
       WHERE u.status = 'pending' 
       ORDER BY u.created_at DESC`,
      []
    );
  }

  async updateStatus(id: string, status: UploadStatus): Promise<void> {
    const now = new Date().toISOString();
    await db.run(
      'UPDATE uploads SET status = ?, updated_at = ? WHERE id = ?',
      [status, now, id]
    );
  }

  async updateFileIds(id: string, fileIds: string[]): Promise<void> {
    await db.run(
      'UPDATE uploads SET file_ids = ? WHERE id = ?',
      [JSON.stringify(fileIds), id]
    );
  }

  async getByDriver(driver_id: string): Promise<Upload[]> {
    return db.all<Upload>(
      'SELECT * FROM uploads WHERE driver_id = ? ORDER BY created_at DESC',
      [driver_id]
    );
  }

  async getApprovedByDriver(driver_id: string): Promise<Upload[]> {
    return db.all<Upload>(
      `SELECT * FROM uploads 
       WHERE driver_id = ? AND status = 'approved' 
       ORDER BY created_at DESC`,
      [driver_id]
    );
  }
}

export const uploadService = new UploadService();
