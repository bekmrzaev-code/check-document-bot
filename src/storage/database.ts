import { Pool, types as pgTypes } from 'pg';

// ── Supabase / Postgres only ─────────────────────────────────────────
// DATABASE_URL must be the Supabase Postgres connection string, e.g.
//   postgresql://postgres.<project-ref>:<DB_PASSWORD>@aws-0-<region>.pooler.supabase.com:6543/postgres
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is not set. Add your Supabase Postgres connection string to .env:\n' +
      '  DATABASE_URL=postgresql://postgres.<project-ref>:<DB_PASSWORD>@aws-0-<region>.pooler.supabase.com:6543/postgres'
  );
}

// node-postgres returns BIGINT (int8) as a string by default to avoid
// precision loss. Telegram ids / group ids fit safely in a JS number,
// and the app expects numbers, so parse int8 → Number.
pgTypes.setTypeParser(20, (v) => (v === null ? null : parseInt(v, 10)));

// Convert "?" placeholders to "$1, $2, ..." (Postgres style)
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
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 10,
    });
    console.log('🗄️  Database: Supabase / Postgres');
  }

  async init(): Promise<void> {
    for (const stmt of PG_SCHEMA) {
      await this.pool.query(stmt);
    }
  }

  async run(sql: string, params: any[] = []): Promise<{ id: string; changes: number }> {
    const res = await this.pool.query(toPg(sql), params);
    return { id: '', changes: res.rowCount ?? 0 };
  }

  async get<T>(sql: string, params: any[] = []): Promise<T | undefined> {
    const res = await this.pool.query(toPg(sql), params);
    return res.rows[0] as T | undefined;
  }

  async all<T>(sql: string, params: any[] = []): Promise<T[]> {
    const res = await this.pool.query(toPg(sql), params);
    return res.rows as T[];
  }

  close(): void {
    void this.pool.end();
  }
}

export const db = new Database();
