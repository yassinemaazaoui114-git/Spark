import * as SQLite from 'expo-sqlite'

// Singleton database handle. All storage modules go through getDb().

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = open()
  }
  return dbPromise
}

async function open(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync('spark.db')
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT 'Folder',
      createdAt INTEGER NOT NULL,
      isDefault INTEGER NOT NULL DEFAULT 0,
      ord INTEGER NOT NULL DEFAULT 0,
      parentId TEXT,
      color TEXT NOT NULL DEFAULT '#8b5cf6',
      deletedAt INTEGER
    );

    CREATE TABLE IF NOT EXISTS records (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      folderId TEXT NOT NULL,
      audioUri TEXT NOT NULL DEFAULT '',
      durationSec REAL NOT NULL DEFAULT 0,
      createdAt INTEGER NOT NULL,
      pinned INTEGER NOT NULL DEFAULT 0,
      tags TEXT NOT NULL DEFAULT '[]',
      archived INTEGER NOT NULL DEFAULT 0,
      type TEXT NOT NULL DEFAULT 'audio',
      textContent TEXT NOT NULL DEFAULT '',
      trimStart REAL,
      trimEnd REAL,
      deletedAt INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_records_folderId ON records(folderId);
    CREATE INDEX IF NOT EXISTS idx_records_createdAt ON records(createdAt);

    CREATE TABLE IF NOT EXISTS tags (
      name TEXT PRIMARY KEY
    );

    CREATE TABLE IF NOT EXISTS saved_searches (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      query TEXT NOT NULL DEFAULT '',
      mode TEXT NOT NULL DEFAULT 'name',
      folderId TEXT,
      tag TEXT,
      durationMin REAL,
      durationMax REAL,
      createdAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      recordId TEXT NOT NULL,
      fireAt INTEGER NOT NULL,
      notificationId TEXT NOT NULL,
      createdAt INTEGER NOT NULL
    );
  `)

  // Migrations for installs created before these columns existed
  // (each throws when the column is already there — that's the happy path)
  await db
    .execAsync("ALTER TABLE saved_searches ADD COLUMN mode TEXT NOT NULL DEFAULT 'name'")
    .catch(() => {})
  await db.execAsync('ALTER TABLE records ADD COLUMN deletedAt INTEGER').catch(() => {})
  await db.execAsync('ALTER TABLE folders ADD COLUMN deletedAt INTEGER').catch(() => {})

  return db
}
