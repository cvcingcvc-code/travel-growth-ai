import { NextRequest } from 'next/server';
import { ensureBootstrapped, getOrgIdFromRequest, handleApiError, ok } from '@/lib/api/http';
import { getTodayDashboard } from '@/lib/services/dashboard.service';

export async function GET(req: NextRequest) {
  try {
    ensureBootstrapped();
    const orgId = getOrgIdFromRequest(req);
    return ok(getTodayDashboard(orgId));
  } catch (err) {
    return handleApiError(err);
  }
}
