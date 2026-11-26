import { NextRequest, NextResponse } from 'next/server';
import { ensureBootstrapped, getOrgIdFromRequest, handleApiError } from '@/lib/api/http';
import { getDb } from '@/lib/db/client';
import { requireOrgAccess } from '@/lib/db/tenant';

export async function GET(req: NextRequest) {
  try {
    ensureBootstrapped();
    const orgId = getOrgIdFromRequest(req);
    const { org } = requireOrgAccess(orgId);
    const db = getDb();

    const bundle = {
      exportedAt: new Date().toISOString(),
      exportVersion: '2.1.0',
      note: '客户体验数据备份（防止云端临时存储冷启动丢失，可重新导入）',
      organization: org,
      brandProfile: db.prepare('SELECT * FROM brand_profiles WHERE organization_id = ?').get(orgId) ?? null,
      products: db.prepare('SELECT * FROM products WHERE organization_id = ?').all(orgId),
      knowledgeDocuments: db.prepare('SELECT * FROM knowledge_documents WHERE organization_id = ?').all(orgId),
      agent: db.prepare('SELECT * FROM organization_agents WHERE organization_id = ?').get(orgId) ?? null,
      intelligenceItems: db.prepare('SELECT * FROM intelligence_items WHERE organization_id = ?').all(orgId),
      contentCases: db.prepare('SELECT * FROM content_cases WHERE organization_id = ?').all(orgId),
      marketingStrategies: db.prepare('SELECT * FROM marketing_strategies WHERE organization_id = ?').all(orgId),
      marketingCampaigns: db.prepare('SELECT * FROM marketing_campaigns WHERE organization_id = ?').all(orgId),
      contentProjects: db.prepare('SELECT * FROM content_projects WHERE organization_id = ?').all(orgId),
      contentVersions: db.prepare('SELECT * FROM content_versions WHERE organization_id = ?').all(orgId),
      assets: db.prepare('SELECT * FROM assets WHERE organization_id = ?').all(orgId),
      publications: db.prepare('SELECT * FROM publications WHERE organization_id = ?').all(orgId),
      performanceMetrics: db.prepare('SELECT * FROM performance_metrics WHERE organization_id = ?').all(orgId),
    };

    return new NextResponse(JSON.stringify(bundle, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="travelgrowth-${org.id}-backup.json"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
