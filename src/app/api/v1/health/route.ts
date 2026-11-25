import { ensureBootstrapped, ok } from '@/lib/api/http';
import { resolveDbPath } from '@/lib/db/client';

export async function GET() {
  ensureBootstrapped();
  return ok({
    status: 'healthy',
    service: 'TravelGrowth AI',
    version: '0.1.0',
    database: resolveDbPath(),
    timestamp: new Date().toISOString(),
  });
}
