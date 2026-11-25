import { NextRequest } from 'next/server';
import { ensureBootstrapped, getOrgIdFromRequest, handleApiError, ok } from '@/lib/api/http';
import {
  createCampaignAndGenerate,
  generateTopics,
  listContentProjects,
} from '@/lib/services/creation.service';

export async function GET(req: NextRequest) {
  try {
    ensureBootstrapped();
    const orgId = getOrgIdFromRequest(req);
    return ok(listContentProjects(orgId));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    ensureBootstrapped();
    const body = (await req.json()) as Record<string, unknown>;
    const orgId = getOrgIdFromRequest(req, body.organizationId as string | undefined);
    const action = String(body.action ?? 'generate');

    if (action === 'topics') {
      const res = await generateTopics({
        organizationId: orgId,
        productId: body.productId ? String(body.productId) : undefined,
        targetPlatform: body.targetPlatform ? String(body.targetPlatform) : undefined,
        targetAudience: body.targetAudience ? String(body.targetAudience) : undefined,
        marketingGoal: body.marketingGoal ? String(body.marketingGoal) : undefined,
      });
      return ok(res, 200);
    }

    const project = await createCampaignAndGenerate({
      organizationId: orgId,
      productId: body.productId ? String(body.productId) : undefined,
      strategyId: body.strategyId ? String(body.strategyId) : undefined,
      topic: body.topic ? String(body.topic) : undefined,
      targetPlatform: body.targetPlatform ? String(body.targetPlatform) : 'xiaohongshu',
      targetAudience: body.targetAudience ? String(body.targetAudience) : undefined,
      marketingGoal: body.marketingGoal ? String(body.marketingGoal) : undefined,
      contentStyle: body.contentStyle ? String(body.contentStyle) : undefined,
      visualRequirements: body.visualRequirements ? String(body.visualRequirements) : undefined,
    });
    return ok(project, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
