import { NextRequest } from 'next/server';
import { ensureBootstrapped, getOrgIdFromRequest, handleApiError, ok } from '@/lib/api/http';
import {
  generateMarketingCampaign,
  listCampaigns,
  updateCampaign,
} from '@/lib/services/campaign.service';

export async function GET(req: NextRequest) {
  try {
    ensureBootstrapped();
    const orgId = getOrgIdFromRequest(req);
    return ok(listCampaigns(orgId));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    ensureBootstrapped();
    const body = (await req.json()) as Record<string, unknown>;
    const orgId = getOrgIdFromRequest(req, body.organizationId as string | undefined);
    const created = await generateMarketingCampaign({
      organizationId: orgId,
      productId: body.productId ? String(body.productId) : undefined,
      title: body.title ? String(body.title) : undefined,
      marketingGoal: body.marketingGoal ? String(body.marketingGoal) : undefined,
      targetPlatforms: Array.isArray(body.targetPlatforms) ? body.targetPlatforms.map(String) : undefined,
    });
    return ok(created, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    ensureBootstrapped();
    const body = (await req.json()) as Record<string, unknown>;
    const orgId = getOrgIdFromRequest(req, body.organizationId as string | undefined);
    const updated = updateCampaign({
      organizationId: orgId,
      campaignId: String(body.campaignId ?? ''),
      title: body.title ? String(body.title) : undefined,
      marketingGoal: body.marketingGoal ? String(body.marketingGoal) : undefined,
      differentiatedSellingPoints: body.differentiatedSellingPoints
        ? String(body.differentiatedSellingPoints)
        : undefined,
      conversionGuide: body.conversionGuide ? String(body.conversionGuide) : undefined,
      approvalStatus: body.approvalStatus as 'draft' | 'pending_approval' | 'approved' | 'archived' | undefined,
    });
    return ok(updated);
  } catch (err) {
    return handleApiError(err);
  }
}
