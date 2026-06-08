import { v4 as uuidv4 } from 'uuid';
import { db } from '../storage/database';
import { ApprovedImage } from '../types';

export class ApprovedImageService {
  async create(upload_id: string, message_id: number, file_id?: string | null): Promise<ApprovedImage> {
    const id = uuidv4();
    const now = new Date().toISOString();

    await db.run(
      'INSERT INTO approved_images (id, upload_id, message_id, file_id, created_at) VALUES (?, ?, ?, ?, ?)',
      [id, upload_id, message_id, file_id || null, now]
    );

    return { id, upload_id, message_id, file_id: file_id || null, created_at: now };
  }

  async getByUploadId(upload_id: string): Promise<ApprovedImage[]> {
    return db.all<ApprovedImage>(
      'SELECT * FROM approved_images WHERE upload_id = ? ORDER BY created_at',
      [upload_id]
    );
  }

  async getByDriverId(driver_id: string): Promise<ApprovedImage[]> {
    return db.all<ApprovedImage>(
      `SELECT ai.* FROM approved_images ai
       JOIN uploads u ON ai.upload_id = u.id
       WHERE u.driver_id = ?
       ORDER BY ai.created_at DESC`,
      [driver_id]
    );
  }

  async getByMessageId(message_id: number): Promise<ApprovedImage | undefined> {
    return db.get<ApprovedImage>(
      'SELECT * FROM approved_images WHERE message_id = ?',
      [message_id]
    );
  }

  async getByUploadIdAndFileId(
    upload_id: string,
    file_id: string
  ): Promise<ApprovedImage | undefined> {
    return db.get<ApprovedImage>(
      'SELECT * FROM approved_images WHERE upload_id = ? AND file_id = ?',
      [upload_id, file_id]
    );
  }

  async updateMessageId(id: string, message_id: number): Promise<void> {
    await db.run('UPDATE approved_images SET message_id = ? WHERE id = ?', [
      message_id,
      id,
    ]);
  }
}

export const approvedImageService = new ApprovedImageService();
