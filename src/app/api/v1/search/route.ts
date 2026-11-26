import { NextRequest } from 'next/server';
import { ensureBootstrapped, getOrgIdFromRequest, handleApiError, ok } from '@/lib/api/http';
import { searchKnowledge } from '@/lib/services/knowledge.service';
import { listProducts } from '@/lib/services/organization.service';
import { listCampaigns } from '@/lib/services/campaign.service';
import { listContentProjects } from '@/lib/services/creation.service';

export async function GET(req: NextRequest) {
  try {
    ensureBootstrapped();
    const orgId = getOrgIdFromRequest(req);
    const q = (req.nextUrl.searchParams.get('q') || '').trim().toLowerCase();
    if (!q) {
      return ok({ knowledge: [], products: [], campaigns: [], creations: [] });
    }

    const knowledge = searchKnowledge(orgId, q, { limit: 4 });
    const products = (listProducts(orgId) as Array<{ id: string; name: string; summary: string }>).filter(
      (p) => p.name.toLowerCase().includes(q) || p.summary.toLowerCase().includes(q)
    );
    const campaigns = (listCampaigns(orgId) as Array<{ id: string; title: string; marketing_goal: string }>).filter(
      (c) => c.title.toLowerCase().includes(q) || c.marketing_goal.toLowerCase().includes(q)
    );
    const creations = listContentProjects(orgId)
      .filter((p) => p.topic.toLowerCase().includes(q))
      .slice(0, 4)
      .map((p) => ({ id: p.id, topic: p.topic, platform: p.target_platform, status: p.review_status }));

    return ok({ knowledge, products, campaigns, creations });
  } catch (err) {
    return handleApiError(err);
  }
}
