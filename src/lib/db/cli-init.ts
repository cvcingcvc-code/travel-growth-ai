import { getDb, resolveDbPath } from './client';
import { seedDatabaseIfEmpty } from './seed';

function main() {
  const dbPath = resolveDbPath();
  getDb();
  const res = seedDatabaseIfEmpty(false);
  console.log(`[db:init] 数据库已就绪: ${dbPath}`);
  console.log(`[db:init] 种子状态:`, res);
}

main();
