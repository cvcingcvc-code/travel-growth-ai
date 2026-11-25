import { getDb } from '../db/client';
import { requireOrgAccess } from '../db/tenant';
import { getProviderStatuses } from '../providers/registry';

export function getTodayDashboard(organizationId: string) {
  const { org } = requireOrgAccess(organizationId);
  const db = getDb();

  const intelItems = db
    .prepare('SELECT * FROM intelligence_items WHERE organization_id = ? ORDER BY collected_at DESC LIMIT 5')
    .all(organizationId);
  const cases = db
    .prepare('SELECT * FROM content_cases WHERE organization_id = ? ORDER BY created_at DESC LIMIT 5')
    .all(organizationId);
  const strategies = db
    .prepare('SELECT * FROM marketing_strategies WHERE organization_id = ? ORDER BY created_at DESC LIMIT 5')
    .all(organizationId);
  const projects = db
    .prepare('SELECT * FROM content_projects WHERE organization_id = ? ORDER BY updated_at DESC LIMIT 8')
    .all(organizationId) as Array<{ id: string; topic: string; review_status: string; target_platform: string; updated_at: string; is_demo: number }>;

  const knowledgeStats = db
    .prepare(
      `SELECT category, COUNT(*) as count,
              SUM(CASE WHEN verification_status = 'verified' THEN 1 ELSE 0 END) as verified_count
       FROM knowledge_documents WHERE organization_id = ? GROUP BY category`
    )
    .all(organizationId);

  const workflowRuns = db
    .prepare('SELECT * FROM workflow_runs WHERE organization_id = ? ORDER BY created_at DESC LIMIT 5')
    .all(organizationId);

  const modelRuns = db
    .prepare('SELECT * FROM model_runs WHERE organization_id = ? ORDER BY created_at DESC LIMIT 8')
    .all(organizationId);

  const pendingReviewCount = projects.filter(
    (p) => p.review_status === 'pending_review' || p.review_status === 'draft'
  ).length;

  return {
    organization: org,
    summary: {
      intelligenceCount: intelItems.length,
      casesCount: cases.length,
      strategiesCount: strategies.length,
      projectsCount: projects.length,
      pendingReviewCount,
    },
    intelligenceItems: intelItems,
    cases,
    strategies,
    projects,
    knowledgeStats,
    workflowRuns,
    modelRuns,
    providerStatuses: getProviderStatuses(organizationId),
  };
}
