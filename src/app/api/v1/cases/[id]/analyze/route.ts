import { NextRequest } from 'next/server';
import { ensureBootstrapped, getOrgIdFromRequest, handleApiError, ok } from '@/lib/api/http';
import { analyzeContentCase } from '@/lib/services/analysis.service';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    ensureBootstrapped();
    const { id } = await context.params;
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const orgId = getOrgIdFromRequest(req, body.organizationId as string | undefined);
    const analysis = await analyzeContentCase(orgId, id);
    return ok(analysis, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
