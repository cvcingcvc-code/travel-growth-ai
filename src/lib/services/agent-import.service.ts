import { getDb } from '../db/client';
import { newId, writeAuditLog, type ActorContext } from '../db/tenant';
import { listContentProjects } from './creation.service';

interface ImportedDraft {
  topic: string;
  productId: string;
  strategyId?: string;
  audience: string;
  goal: string;
  style: string;
  titles: string[];
  selectedTitle: string;
  body: string;
  cover: string;
  pages: Array<{ page: number; title: string; visual: string; copy: string; assetId: string }>;
  hashtags: string[];
  cta: string;
  knowledgeIds: string[];
  warnings: string[];
}

export function importAgentDraft(orgId: string, actor: ActorContext, draft: ImportedDraft) {
  const db = getDb();
  const product = db.prepare('SELECT id FROM products WHERE id = ? AND organization_id = ?');
  const strategy = db.prepare('SELECT id FROM marketing_strategies WHERE id = ? AND organization_id = ?');
  if (!product.get(draft.productId, orgId) || (draft.strategyId && !strategy.get(draft.strategyId, orgId))) {
    throw new Error('引用的产品或策略不在当前企业');
  }
  const lookupDocument = db.prepare(
    'SELECT id AS documentId, title, category, verification_status AS verificationStatus FROM knowledge_documents WHERE id = ? AND organization_id = ?'
  );
  const citations = draft.knowledgeIds.map((id) => {
    const item = lookupDocument.get(id, orgId);
    if (!item) throw new Error('引用的知识条目不在当前企业');
    return item;
  });
  const lookupAsset = db.prepare(
    "SELECT file_url FROM assets WHERE id = ? AND organization_id = ? AND mime_type = 'image/png'"
  );
  const pages = draft.pages.map((page) => {
    const asset = lookupAsset.get(page.assetId, orgId);
    if (!asset || typeof asset.file_url !== 'string' || !asset.file_url.startsWith('/demo-assets/')) {
      throw new Error('图文素材不在当前企业或不是本地 PNG');
    }
    return { ...page, imageUrl: asset.file_url };
  });

  const projectId = newId('proj');
  const versionId = newId('ver');
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare(`
      INSERT INTO content_projects (id, organization_id, product_id, strategy_id, topic,
        target_platform, target_audience, marketing_goal, content_style, visual_requirements,
        review_status, current_version_id, is_demo)
      VALUES (?, ?, ?, ?, ?, 'xiaohongshu', ?, ?, ?, '1080×1440 PNG × 6', 'pending_review', ?, 1)
    `).run(projectId, orgId, draft.productId, draft.strategyId ?? null, draft.topic, draft.audience,
      draft.goal, draft.style, versionId);
    db.prepare(`
      INSERT INTO content_versions (id, organization_id, project_id, version_number, titles_json,
        selected_title, body_copy, cover_design_note, carousel_plan_json, hashtags_json, conversion_cta,
        knowledge_citations_json, risk_check_json, data_origin)
      VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'external_agent')
    `).run(versionId, orgId, projectId, JSON.stringify(draft.titles), draft.selectedTitle, draft.body, draft.cover,
      JSON.stringify(pages), JSON.stringify(draft.hashtags), draft.cta, JSON.stringify(citations),
      JSON.stringify({ passed: draft.warnings.length === 0, warnings: draft.warnings }));
    writeAuditLog({
      organizationId: orgId, ...actor, action: 'creation.import_agent', targetType: 'content_project',
      targetId: projectId, detail: { versionId, knowledgeIds: draft.knowledgeIds, assetIds: pages.map((page) => page.assetId) },
    });
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return listContentProjects(orgId).find((item) => item.id === projectId);
}

interface ExternalAnalysis {
  caseId: string;
  titleHook: string;
  audience: string;
  pain: string;
  structure: string;
  emotion: string;
  visual: string;
  sellingPoints: string;
  conversion: string;
  reusable: string;
  fitScore: number;
  fitReason: string;
  evidence: string;
  credibility: 'low' | 'medium' | 'high';
}

export function saveAgentAnalysis(orgId: string, actor: ActorContext, analysis: ExternalAnalysis) {
  const db = getDb();
  if (!db.prepare('SELECT id FROM content_cases WHERE id = ? AND organization_id = ?').get(analysis.caseId, orgId)) {
    throw new Error('市场案例不在当前企业');
  }
  const id = newId('ana');
  db.prepare(`INSERT INTO case_analyses (
    id, organization_id, case_id, title_hook, target_audience, user_pain_points,
    content_structure, emotional_value, visual_style, product_selling_points, conversion_method,
    reusable_strategy, org_fit_score, org_fit_reason, evidence_source, credibility_level, data_origin
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'external_agent')`)
    .run(id, orgId, analysis.caseId, analysis.titleHook, analysis.audience, analysis.pain, analysis.structure,
      analysis.emotion, analysis.visual, analysis.sellingPoints, analysis.conversion, analysis.reusable,
      analysis.fitScore, analysis.fitReason, analysis.evidence, analysis.credibility);
  writeAuditLog({
    organizationId: orgId, ...actor, action: 'case.analyze_agent', targetType: 'content_case',
    targetId: analysis.caseId, detail: { analysisId: id },
  });
  return { id };
}

export function recordAgentRun(orgId: string, actor: ActorContext, run: {
  name: string; status: 'completed' | 'running' | 'failed' | 'partial'; summary: string;
}) {
  const db = getDb();
  const id = newId('wfr');
  db.prepare(`INSERT INTO workflow_runs (id, organization_id, workflow_name, trigger_source, status, summary, finished_at)
    VALUES (?, ?, ?, 'api', ?, ?, CASE WHEN ? = 'running' THEN NULL ELSE datetime('now') END)`)
    .run(id, orgId, run.name, run.status, run.summary, run.status);
  writeAuditLog({
    organizationId: orgId, ...actor, action: 'workflow.record_agent', targetType: 'workflow_run',
    targetId: id, detail: { status: run.status },
  });
  return { id };
}
