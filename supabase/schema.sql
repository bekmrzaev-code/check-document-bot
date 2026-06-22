-- ============================================================
-- DriverFlow — Supabase / Postgres schema
-- ============================================================
-- The backend auto-creates these tables on first boot when
-- DATABASE_URL points at this database, so running this file
-- manually is optional. It's provided for reference and for
-- setting up the schema via the Supabase SQL Editor.
--
-- Telegram ids / group ids exceed 32-bit, so BIGINT is used.
-- Booleans are stored as INTEGER (0/1) to match the app.
-- Timestamps are ISO-8601 TEXT (the app generates them).
-- ============================================================

CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS drivers (
  id TEXT PRIMARY KEY,
  telegram_user_id BIGINT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  admin_name TEXT,
  status TEXT DEFAULT 'pending',
  company_id TEXT,
  truck_number TEXT,
  blocked INTEGER DEFAULT 0,
  fully_approved INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS uploads (
  id TEXT PRIMARY KEY,
  driver_id TEXT NOT NULL,
  group_name TEXT NOT NULL,
  group_id BIGINT,
  status TEXT DEFAULT 'pending',
  image_count INTEGER NOT NULL,
  file_ids TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS approved_images (
  id TEXT PRIMARY KEY,
  upload_id TEXT NOT NULL,
  message_id BIGINT NOT NULL,
  file_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS telegram_groups (
  group_id BIGINT PRIMARY KEY,
  group_name TEXT NOT NULL,
  admin_name TEXT,
  company_id TEXT,
  group_type TEXT DEFAULT 'group',
  member_count INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  added_at TEXT NOT NULL,
  last_seen TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  session_id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scheduled_messages (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  time_of_day TEXT NOT NULL,
  target TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  last_run_date TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_drivers_telegram_user_id ON drivers(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_uploads_driver_id ON uploads(driver_id);
CREATE INDEX IF NOT EXISTS idx_uploads_status ON uploads(status);
CREATE INDEX IF NOT EXISTS idx_drivers_company_id ON drivers(company_id);
CREATE INDEX IF NOT EXISTS idx_groups_company_id ON telegram_groups(company_id);
CREATE INDEX IF NOT EXISTS idx_uploads_group_id ON uploads(group_id);
CREATE INDEX IF NOT EXISTS idx_approved_images_upload_id ON approved_images(upload_id);
CREATE INDEX IF NOT EXISTS idx_approved_images_message_id ON approved_images(message_id);

-- NOTE: The backend connects with the service/DB credentials (DATABASE_URL),
-- not the publishable anon key, so it bypasses RLS. If you ever expose these
-- tables to the browser via the anon key, add appropriate RLS policies.
