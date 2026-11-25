import { ensureBootstrapped, handleApiError, ok } from '@/lib/api/http';
import { getDb } from '@/lib/db/client';
import { seedDatabaseIfEmpty } from '@/lib/db/seed';
import { isDemoMode } from '@/lib/demo/demo-mode';

export async function POST() {
  try {
    ensureBootstrapped();
    const db = getDb();

    // 仅重置演示数据 (is_demo = 1) 或 Demo 模式下的临时数据，严禁误删本地正式企业数据
    if (isDemoMode()) {
      db.exec('DELETE FROM organizations;');
    } else {
      db.exec('DELETE FROM organizations WHERE is_demo = 1;');
    }

    const res = seedDatabaseIfEmpty(true);
    return ok({
      reset: true,
      demoMode: isDemoMode(),
      seeded: res.seeded,
      message: '演示数据已重置为初始状态。',
    });
  } catch (err) {
    return handleApiError(err);
  }
}
