import { NextRequest } from 'next/server';
import { ensureBootstrapped, getOrgIdFromRequest, handleApiError, ok } from '@/lib/api/http';
import {
  ingestCsvIntelligence,
  ingestManualIntelligence,
  ingestPublicUrlOrRss,
  listIntelligenceItems,
  listSources,
} from '@/lib/services/intelligence.service';

export async function GET(req: NextRequest) {
  try {
    ensureBootstrapped();
    const orgId = getOrgIdFromRequest(req);
    const category = req.nextUrl.searchParams.get('category') ?? undefined;
    return ok({
      items: listIntelligenceItems(orgId, category),
      sources: listSources(orgId),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    ensureBootstrapped();
    const body = (await req.json()) as Record<string, unknown>;
    const orgId = getOrgIdFromRequest(req, body.organizationId as string | undefined);
    const mode = String(body.mode ?? 'manual');

    if (mode === 'csv') {
      return ok(ingestCsvIntelligence(orgId, String(body.csvText ?? '')), 201);
    }
    if (mode === 'url' || mode === 'rss') {
      const res = await ingestPublicUrlOrRss({
        organizationId: orgId,
        url: String(body.url ?? ''),
        mode,
      });
      return ok(res, 201);
    }

    const res = ingestManualIntelligence({
      organizationId: orgId,
      title: String(body.title ?? ''),
      summary: body.summary ? String(body.summary) : undefined,
      rawContent: String(body.rawContent ?? body.title ?? ''),
      category: body.category ? String(body.category) : 'trend',
      keywords: Array.isArray(body.keywords) ? body.keywords.map(String) : [],
      sourceName: body.sourceName ? String(body.sourceName) : '手动录入',
      sourceUrl: body.sourceUrl ? String(body.sourceUrl) : '',
      isDemo: Boolean(body.isDemo),
    });
    return ok(res, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
