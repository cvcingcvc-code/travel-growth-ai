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

  // 安全增量迁移：兼容旧本地 SQLite 数据库的 assets 新增字段
  const assetCols = (dbInstance.prepare('PRAGMA table_info(assets)').all() as Array<{ name: string }>).map((c) => c.name);
  if (!assetCols.includes('tags_json')) {
    dbInstance.exec("ALTER TABLE assets ADD COLUMN tags_json TEXT NOT NULL DEFAULT '[]';");
  }
  if (!assetCols.includes('product_id')) {
    dbInstance.exec('ALTER TABLE assets ADD COLUMN product_id TEXT;');
  }
  if (!assetCols.includes('is_favorite')) {
    dbInstance.exec('ALTER TABLE assets ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0;');
  }

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
