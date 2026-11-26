import { NextRequest } from 'next/server';
import { ensureBootstrapped, getOrgIdFromRequest, handleApiError, ok } from '@/lib/api/http';
import { getDb } from '@/lib/db/client';
import { requireOrgAccess } from '@/lib/db/tenant';

export async function GET(req: NextRequest) {
  try {
    ensureBootstrapped();
    const orgId = getOrgIdFromRequest(req);
    const { org } = requireOrgAccess(orgId);
    const db = getDb();

    const docs = db
      .prepare('SELECT * FROM knowledge_documents WHERE organization_id = ? ORDER BY updated_at DESC')
      .all(orgId) as Array<{
      id: string;
      category: string;
      title: string;
      content: string;
      source_ref: string;
      verification_status: string;
      version: number;
      updated_at: string;
      is_demo: number;
    }>;

    const products = db
      .prepare('SELECT id, name, category, verification_status, price_info FROM products WHERE organization_id = ?')
      .all(orgId) as Array<{ id: string; name: string; category: string; verification_status: string; price_info: string }>;

    const campaigns = db
      .prepare('SELECT id, product_id, title, approval_status FROM marketing_campaigns WHERE organization_id = ?')
      .all(orgId) as Array<{ id: string; product_id: string | null; title: string; approval_status: string }>;

    const cases = db
      .prepare('SELECT id, title, platform FROM content_cases WHERE organization_id = ?')
      .all(orgId) as Array<{ id: string; title: string; platform: string }>;

    const projects = db
      .prepare('SELECT id, product_id, topic, review_status FROM content_projects WHERE organization_id = ?')
      .all(orgId) as Array<{ id: string; product_id: string | null; topic: string; review_status: string }>;

    const auditLogs = db
      .prepare(
        "SELECT * FROM audit_logs WHERE organization_id = ? AND (target_type = 'knowledge_document' OR action LIKE 'knowledge.%') ORDER BY created_at DESC LIMIT 20"
      )
      .all(orgId);

    const brand = db
      .prepare('SELECT * FROM brand_profiles WHERE organization_id = ?')
      .get(orgId);

    // 基于真实数据库外键与归属构建知识关系图（严禁随机生成虚假节点或连线）
    const nodes: Array<{
      id: string;
      label: string;
      type: 'org' | 'knowledge' | 'product' | 'campaign' | 'case' | 'creation';
      status?: string;
      targetView: string;
      targetId: string;
    }> = [
      {
        id: org.id,
        label: org.name,
        type: 'org',
        targetView: 'profile',
        targetId: org.id,
      },
    ];

    const edges: Array<{ from: string; to: string; relation: string }> = [];

    for (const d of docs) {
      nodes.push({
        id: d.id,
        label: d.title.slice(0, 18),
        type: 'knowledge',
        status: d.verification_status,
        targetView: 'knowledge',
        targetId: d.id,
      });
      edges.push({ from: org.id, to: d.id, relation: d.category });
    }

    for (const p of products) {
      nodes.push({
        id: p.id,
        label: p.name.slice(0, 16),
        type: 'product',
        status: p.verification_status,
        targetView: 'products',
        targetId: p.id,
      });
      edges.push({ from: org.id, to: p.id, relation: '产品档案' });
    }

    for (const c of campaigns) {
      nodes.push({
        id: c.id,
        label: c.title.slice(0, 16),
        type: 'campaign',
        status: c.approval_status,
        targetView: 'campaigns',
        targetId: c.id,
      });
      edges.push({ from: c.product_id || org.id, to: c.id, relation: '关联方案' });
    }

    for (const cs of cases.slice(0, 5)) {
      nodes.push({
        id: cs.id,
        label: cs.title.slice(0, 16),
        type: 'case',
        targetView: 'intelligence',
        targetId: cs.id,
      });
      edges.push({ from: org.id, to: cs.id, relation: '对标案例' });
    }

    for (const pr of projects.slice(0, 6)) {
      nodes.push({
        id: pr.id,
        label: pr.topic.slice(0, 16),
        type: 'creation',
        status: pr.review_status,
        targetView: 'creation',
        targetId: pr.id,
      });
      edges.push({ from: pr.product_id || org.id, to: pr.id, relation: '生成内容' });
    }

    const totalDocs = docs.length;
    const verifiedDocs = docs.filter((d) => d.verification_status === 'verified').length;
    const unverifiedDocs = docs.filter((d) => d.verification_status !== 'verified');
    const unverifiedProducts = products.filter((p) => p.verification_status !== 'verified');
    const coveredCategories = new Set(docs.map((d) => d.category)).size;
    const completenessScore = Math.min(
      100,
      Math.round((coveredCategories / 6) * 60 + (totalDocs > 0 ? (verifiedDocs / totalDocs) * 40 : 0))
    );

    return ok({
      organization: org,
      brandProfile: brand ?? null,
      stats: {
        totalDocs,
        verifiedDocs,
        unverifiedDocsCount: unverifiedDocs.length,
        unverifiedProductsCount: unverifiedProducts.length,
        productsCount: products.length,
        campaignsCount: campaigns.length,
        casesCount: cases.length,
        coveredCategories,
        completenessScore,
      },
      documents: docs,
      unverifiedDocs,
      unverifiedProducts,
      products,
      campaigns,
      cases,
      graph: { nodes, edges },
      auditLogs,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
