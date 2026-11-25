import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { SCHEMA_SQL } from './schema';

let dbInstance: DatabaseSync | null = null;
let currentDbPath: string | null = null;

export function resolveDbPath(): string {
  const configured = process.env.DATABASE_PATH || './data/travel-growth.db';
  if (configured === ':memory:') return ':memory:';
  return path.isAbsolute(configured)
    ? configured
    : path.resolve(process.cwd(), configured);
}

export function getDb(): DatabaseSync {
  const targetPath = resolveDbPath();
  if (dbInstance && currentDbPath === targetPath) {
    return dbInstance;
  }

  if (targetPath !== ':memory:') {
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  dbInstance = new DatabaseSync(targetPath);
  currentDbPath = targetPath;
  dbInstance.exec(SCHEMA_SQL);
  return dbInstance;
}

export function resetDbForTests(dbPath = ':memory:'): DatabaseSync {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {
      // ignore
    }
  }
  process.env.DATABASE_PATH = dbPath;
  dbInstance = null;
  currentDbPath = null;
  return getDb();
}
