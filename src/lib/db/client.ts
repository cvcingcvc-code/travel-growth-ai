import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { SCHEMA_SQL } from './schema';

let dbInstance: DatabaseSync | null = null;
let currentDbPath: string | null = null;

export function resolveDbPath(): string {
  const configured = process.env.DATABASE_PATH;
  if (configured === ':memory:') return ':memory:';
  if (configured) {
    return path.isAbsolute(configured)
      ? configured
      : path.resolve(process.cwd(), configured);
  }
  if (process.env.VERCEL === '1') {
    return '/tmp/travel-growth-demo.db';
  }
  return path.resolve(process.cwd(), './data/travel-growth.db');
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
