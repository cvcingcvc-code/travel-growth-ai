import { NextRequest } from 'next/server';
import { ensureBootstrapped, getOrgIdFromRequest, handleApiError, ok } from '@/lib/api/http';
import { listMarketingStrategies, saveStrategyCard } from '@/lib/services/analysis.service';

export async function GET(req: NextRequest) {
  try {
    ensureBootstrapped();
    const orgId = getOrgIdFromRequest(req);
    return ok(listMarketingStrategies(orgId));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    ensureBootstrapped();
    const body = (await req.json()) as Record<string, unknown>;
    const orgId = getOrgIdFromRequest(req, body.organizationId as string | undefined);
    const saved = saveStrategyCard({
      organizationId: orgId,
      caseAnalysisId: body.caseAnalysisId ? String(body.caseAnalysisId) : undefined,
      title: String(body.title ?? ''),
      targetPlatform: body.targetPlatform ? String(body.targetPlatform) : 'xiaohongshu',
      targetAudience: body.targetAudience ? String(body.targetAudience) : '',
      hookPattern: String(body.hookPattern ?? ''),
      structureTemplate: String(body.structureTemplate ?? ''),
      conversionCta: body.conversionCta ? String(body.conversionCta) : '',
      applicableScenarios: body.applicableScenarios ? String(body.applicableScenarios) : '',
    });
    return ok(saved, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
