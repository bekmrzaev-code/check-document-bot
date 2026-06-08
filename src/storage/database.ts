import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { Pool, types as pgTypes } from 'pg';

// ── Dialect selection ────────────────────────────────────────────────
// If DATABASE_URL (a Postgres / Supabase connection string) is set, use
// Postgres. Otherwise fall back to a local SQLite file. The public
// interface (init / run / get / all) is identical for both.
const DATABASE_URL = process.env.DATABASE_URL;
const USE_PG = !!DATABASE_URL;

// node-postgres returns BIGINT (int8) as a string by default to avoid
// precision loss. Telegram ids / group ids fit safely in a JS number,
// and the app expects numbers, so parse int8 → Number.
pgTypes.setTypeParser(20, (v) => (v === null ? null : parseInt(v, 10)));

const dataDir = path.join(process.cwd(), 'data');
if (!USE_PG && !fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const dbPath = process.env.DB_PATH || path.join(dataDir, 'db.sqlite');

// Convert "?" placeholders (SQLite style) to "$1, $2, ..." (Postgres style)
function toPg(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

// Full Postgres schema (fresh) — no incremental migrations needed.
const PG_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS drivers (
    id TEXT PRIMARY KEY,
    telegram_user_id BIGINT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    admin_name TEXT,
    status TEXT DEFAULT 'pending',
    company_id TEXT,
    truck_number TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS uploads (
    id TEXT PRIMARY KEY,
    driver_id TEXT NOT NULL,
    group_name TEXT NOT NULL,
    group_id BIGINT,
    status TEXT DEFAULT 'pending',
    image_count INTEGER NOT NULL,
    file_ids TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS approved_images (
    id TEXT PRIMARY KEY,
    upload_id TEXT NOT NULL,
    message_id BIGINT NOT NULL,
    file_id TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS telegram_groups (
    group_id BIGINT PRIMARY KEY,
    group_name TEXT NOT NULL,
    admin_name TEXT,
    group_type TEXT DEFAULT 'group',
    member_count INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    added_at TEXT NOT NULL,
    last_seen TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS admin_sessions (
    session_id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS scheduled_messages (
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL,
    time_of_day TEXT NOT NULL,
    target TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    last_run_date TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_drivers_telegram_user_id ON drivers(telegram_user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_uploads_driver_id ON uploads(driver_id)`,
  `CREATE INDEX IF NOT EXISTS idx_uploads_status ON uploads(status)`,
  `CREATE INDEX IF NOT EXISTS idx_drivers_company_id ON drivers(company_id)`,
];

export class Database {
  private db?: sqlite3.Database;
  private pool?: Pool;

  constructor() {
    if (USE_PG) {
      this.pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        max: 10,
      });
      console.log('🗄️  Database: Supabase / Postgres');
    } else {
      this.db = new sqlite3.Database(dbPath);
      this.db.configure('busyTimeout', 5000);
      console.log('🗄️  Database: SQLite (' + dbPath + ')');
    }
  }

  async init(): Promise<void> {
    if (USE_PG) {
      for (const stmt of PG_SCHEMA) {
        await this.pool!.query(stmt);
      }
      return;
    }
    return this.initSqlite();
  }

  private initSqlite(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db!.serialize(() => {
        let completed = 0;
        const total = 18;
        const done = (err?: Error | null) => {
          if (err) { reject(err); return; }
          if (++completed === total) resolve();
        };
        const alter = (sql: string) =>
          this.db!.run(sql, (err) => {
            if (err && !err.message.includes('duplicate')) { reject(err); return; }
            done();
          });

        this.db!.run(`CREATE TABLE IF NOT EXISTS companies (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL)`, (e) => done(e));
        this.db!.run(`CREATE TABLE IF NOT EXISTS drivers (id TEXT PRIMARY KEY, telegram_user_id INTEGER NOT NULL UNIQUE, name TEXT NOT NULL, status TEXT DEFAULT 'pending', company_id TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, FOREIGN KEY (company_id) REFERENCES companies(id))`, (e) => done(e));
        this.db!.run(`CREATE TABLE IF NOT EXISTS uploads (id TEXT PRIMARY KEY, driver_id TEXT NOT NULL, group_name TEXT NOT NULL, status TEXT DEFAULT 'pending', image_count INTEGER NOT NULL, file_ids TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, FOREIGN KEY (driver_id) REFERENCES drivers(id))`, (e) => done(e));
        this.db!.run(`CREATE TABLE IF NOT EXISTS approved_images (id TEXT PRIMARY KEY, upload_id TEXT NOT NULL, message_id INTEGER NOT NULL, file_id TEXT, created_at TEXT NOT NULL, FOREIGN KEY (upload_id) REFERENCES uploads(id))`, (e) => done(e));
        this.db!.run(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`, (e) => done(e));
        this.db!.run(`CREATE TABLE IF NOT EXISTS telegram_groups (group_id INTEGER PRIMARY KEY, group_name TEXT NOT NULL, group_type TEXT DEFAULT 'group', member_count INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1, added_at TEXT NOT NULL, last_seen TEXT NOT NULL)`, (e) => done(e));
        this.db!.run(`CREATE TABLE IF NOT EXISTS admin_sessions (session_id TEXT PRIMARY KEY, created_at TEXT NOT NULL, expires_at TEXT NOT NULL)`, (e) => done(e));
        this.db!.run(`CREATE TABLE IF NOT EXISTS scheduled_messages (id TEXT PRIMARY KEY, text TEXT NOT NULL, time_of_day TEXT NOT NULL, target TEXT NOT NULL, is_active INTEGER DEFAULT 1, last_run_date TEXT, created_at TEXT NOT NULL)`, (e) => done(e));
        this.db!.run(`CREATE INDEX IF NOT EXISTS idx_drivers_telegram_user_id ON drivers(telegram_user_id)`, (e) => done(e));
        this.db!.run(`CREATE INDEX IF NOT EXISTS idx_uploads_driver_id ON uploads(driver_id)`, (e) => done(e));
        this.db!.run(`CREATE INDEX IF NOT EXISTS idx_uploads_status ON uploads(status)`, (e) => done(e));
        this.db!.run(`CREATE INDEX IF NOT EXISTS idx_drivers_company_id ON drivers(company_id)`, (e) => done(e));
        alter(`ALTER TABLE uploads ADD COLUMN file_ids TEXT`);
        alter(`ALTER TABLE approved_images ADD COLUMN file_id TEXT`);
        alter(`ALTER TABLE drivers ADD COLUMN truck_number TEXT`);
        alter(`ALTER TABLE uploads ADD COLUMN group_id INTEGER`);
        alter(`ALTER TABLE drivers ADD COLUMN admin_name TEXT`);
        alter(`ALTER TABLE telegram_groups ADD COLUMN admin_name TEXT`);
      });
    });
  }

  async run(sql: string, params: any[] = []): Promise<{ id: string; changes: number }> {
    if (USE_PG) {
      const res = await this.pool!.query(toPg(sql), params);
      return { id: '', changes: res.rowCount ?? 0 };
    }
    return new Promise((resolve, reject) => {
      this.db!.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ id: String(this.lastID), changes: this.changes });
      });
    });
  }

  async get<T>(sql: string, params: any[] = []): Promise<T | undefined> {
    if (USE_PG) {
      const res = await this.pool!.query(toPg(sql), params);
      return res.rows[0] as T | undefined;
    }
    return new Promise((resolve, reject) => {
      this.db!.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row as T | undefined);
      });
    });
  }

  async all<T>(sql: string, params: any[] = []): Promise<T[]> {
    if (USE_PG) {
      const res = await this.pool!.query(toPg(sql), params);
      return res.rows as T[];
    }
    return new Promise((resolve, reject) => {
      this.db!.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows as T[]);
      });
    });
  }

  close(): void {
    if (USE_PG) { void this.pool!.end(); }
    else { this.db!.close(); }
  }
}

export const db = new Database();
