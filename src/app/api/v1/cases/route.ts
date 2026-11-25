import { NextRequest } from 'next/server';
import { ensureBootstrapped, getOrgIdFromRequest, handleApiError, ok } from '@/lib/api/http';
import { createContentCase, listContentCases } from '@/lib/services/analysis.service';

export async function GET(req: NextRequest) {
  try {
    ensureBootstrapped();
    const orgId = getOrgIdFromRequest(req);
    return ok(listContentCases(orgId));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    ensureBootstrapped();
    const body = (await req.json()) as Record<string, unknown>;
    const orgId = getOrgIdFromRequest(req, body.organizationId as string | undefined);
    const created = createContentCase({
      organizationId: orgId,
      platform: body.platform ? String(body.platform) : 'xiaohongshu',
      title: String(body.title ?? ''),
      authorHandle: body.authorHandle ? String(body.authorHandle) : '',
      sourceUrl: String(body.sourceUrl ?? ''),
      rawText: String(body.rawText ?? ''),
      metrics: (body.metrics as Record<string, number | string>) ?? {},
      metricsVerified: Boolean(body.metricsVerified),
      isDemo: Boolean(body.isDemo),
    });
    return ok(created, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
