import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = path.join(process.cwd(), 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.DB_PATH || path.join(dataDir, 'db.sqlite');

export class Database {
  private db: sqlite3.Database;

  constructor() {
    this.db = new sqlite3.Database(dbPath);
    this.db.configure('busyTimeout', 5000);
  }

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        let completed = 0;
        const total = 9;

        const checkComplete = (err?: Error) => {
          if (err) {
            reject(err);
            return;
          }
          completed++;
          if (completed === total) {
            resolve();
          }
        };

        // Companies table
        this.db.run(
          `CREATE TABLE IF NOT EXISTS companies (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            created_at TEXT NOT NULL
          )`,
          (err) => checkComplete(err || undefined)
        );

        // Drivers table
        this.db.run(
          `CREATE TABLE IF NOT EXISTS drivers (
            id TEXT PRIMARY KEY,
            telegram_user_id INTEGER NOT NULL UNIQUE,
            name TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            company_id TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (company_id) REFERENCES companies(id)
          )`,
          (err) => checkComplete(err || undefined)
        );

        // Uploads table
        this.db.run(
          `CREATE TABLE IF NOT EXISTS uploads (
            id TEXT PRIMARY KEY,
            driver_id TEXT NOT NULL,
            group_name TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            image_count INTEGER NOT NULL,
            file_ids TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (driver_id) REFERENCES drivers(id)
          )`,
          (err) => checkComplete(err || undefined)
        );

        // Approved images table
        this.db.run(
          `CREATE TABLE IF NOT EXISTS approved_images (
            id TEXT PRIMARY KEY,
            upload_id TEXT NOT NULL,
            message_id INTEGER NOT NULL,
            file_id TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (upload_id) REFERENCES uploads(id)
          )`,
          (err) => checkComplete(err || undefined)
        );

        // Indexes
        this.db.run(
          `CREATE INDEX IF NOT EXISTS idx_drivers_telegram_user_id 
           ON drivers(telegram_user_id)`,
          (err) => checkComplete(err || undefined)
        );

        this.db.run(
          `CREATE INDEX IF NOT EXISTS idx_uploads_driver_id 
           ON uploads(driver_id)`,
          (err) => checkComplete(err || undefined)
        );

        this.db.run(
          `CREATE INDEX IF NOT EXISTS idx_uploads_status 
           ON uploads(status)`,
          (err) => checkComplete(err || undefined)
        );

        this.db.run(
          `CREATE INDEX IF NOT EXISTS idx_drivers_company_id 
           ON drivers(company_id)`,
          (err) => checkComplete(err || undefined)
        );

        // Safe migration: uploads.file_ids
        this.db.run(`ALTER TABLE uploads ADD COLUMN file_ids TEXT`, (err) => {
          if (err && !err.message.includes('duplicate')) {
            reject(err);
            return;
          }
          checkComplete();
        });

        // Safe migration: approved_images.file_id
        this.db.run(`ALTER TABLE approved_images ADD COLUMN file_id TEXT`, (err) => {
          if (err && !err.message.includes('duplicate')) {
            reject(err);
            return;
          }
          checkComplete();
        });
      });
    });
  }

  async run(sql: string, params: any[] = []): Promise<{ id: string; changes: number }> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ id: String(this.lastID), changes: this.changes });
      });
    });
  }

  async get<T>(sql: string, params: any[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row as T | undefined);
      });
    });
  }

  async all<T>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows as T[]);
      });
    });
  }

  close(): void {
    this.db.close();
  }
}

export const db = new Database();