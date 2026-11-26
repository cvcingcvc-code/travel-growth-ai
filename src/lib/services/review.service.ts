import { getDb } from '../db/client';
import { newId, requireOrgAccess, writeAuditLog } from '../db/tenant';
import { createKnowledgeDocument } from './knowledge.service';
import { logAgentStep } from './agent-orchestrator.service';

export function getReviewOverview(organizationId: string) {
  requireOrgAccess(organizationId);
  const db = getDb();
  const accounts = db
    .prepare('SELECT * FROM social_accounts WHERE organization_id = ? ORDER BY created_at DESC')
    .all(organizationId);
  const publications = db
    .prepare(
      `SELECT p.*, cp.topic, cp.target_platform, cv.selected_title
       FROM publications p
       LEFT JOIN content_projects cp ON cp.id = p.project_id
       LEFT JOIN content_versions cv ON cv.id = p.version_id
       WHERE p.organization_id = ?
       ORDER BY p.published_at DESC`
    )
    .all(organizationId);
  const metrics = db
    .prepare(
      `SELECT m.*, p.platform, p.published_url, cp.topic
       FROM performance_metrics m
       LEFT JOIN publications p ON p.id = m.publication_id
       LEFT JOIN content_projects cp ON cp.id = p.project_id
       WHERE m.organization_id = ?
       ORDER BY m.recorded_at DESC`
    )
    .all(organizationId);
  const insights = db
    .prepare('SELECT * FROM review_insights WHERE organization_id = ? ORDER BY created_at DESC LIMIT 10')
    .all(organizationId);

  return { accounts, publications, metrics, insights };
}

export function createSocialAccount(params: {
  organizationId: string;
  platform: 'xiaohongshu' | 'douyin' | 'wechat_oa' | 'wechat_channels' | 'general';
  accountName: string;
  accountHandle?: string;
  followersCount?: number;
}) {
  requireOrgAccess(params.organizationId);
  const db = getDb();
  const id = newId('acc');
  db.prepare(
    `INSERT INTO social_accounts (id, organization_id, platform, account_name, account_handle, auth_status, followers_count)
     VALUES (?, ?, ?, ?, ?, 'manual_only', ?)`
  ).run(
    id,
    params.organizationId,
    params.platform,
    params.accountName.trim(),
    params.accountHandle?.trim() ?? '',
    Number(params.followersCount ?? 0)
  );
  return db.prepare('SELECT * FROM social_accounts WHERE id = ?').get(id);
}

export function recordPerformanceMetric(params: {
  organizationId: string;
  publicationId: string;
  views: number;
  likes: number;
  collects: number;
  comments: number;
  inquiries: number;
  bookings: number;
  dataSourceLabel: string;
  takeawayNote?: string;
}) {
  requireOrgAccess(params.organizationId);
  const db = getDb();
  const pub = db
    .prepare('SELECT id FROM publications WHERE id = ? AND organization_id = ?')
    .get(params.publicationId, params.organizationId);
  if (!pub) throw new Error('发布记录不存在或不属于当前企业');

  const id = newId('met');
  const note = `[来源：${params.dataSourceLabel}] ${params.takeawayNote || ''}`.trim();
  db.prepare(
    `INSERT INTO performance_metrics (id, organization_id, publication_id, views, likes, collects, comments, inquiries, bookings, takeaway_note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    params.organizationId,
    params.publicationId,
    Math.max(0, Number(params.views || 0)),
    Math.max(0, Number(params.likes || 0)),
    Math.max(0, Number(params.collects || 0)),
    Math.max(0, Number(params.comments || 0)),
    Math.max(0, Number(params.inquiries || 0)),
    Math.max(0, Number(params.bookings || 0)),
    note
  );

  writeAuditLog({
    organizationId: params.organizationId,
    action: 'metrics.record',
    targetType: 'performance_metric',
    targetId: id,
    detail: { publicationId: params.publicationId, dataSourceLabel: params.dataSourceLabel },
  });

  return db.prepare('SELECT * FROM performance_metrics WHERE id = ?').get(id);
}

export function generateDataReviewInsight(organizationId: string) {
  requireOrgAccess(organizationId);
  const started = Date.now();
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT m.*, cp.topic, cv.selected_title, p.platform
       FROM performance_metrics m
       JOIN publications p ON p.id = m.publication_id
       JOIN content_projects cp ON cp.id = p.project_id
       LEFT JOIN content_versions cv ON cv.id = p.version_id
       WHERE m.organization_id = ?
       ORDER BY m.recorded_at DESC`
    )
    .all(organizationId) as Array<{
    views: number;
    likes: number;
    collects: number;
    comments: number;
    inquiries: number;
    bookings: number;
    topic: string;
    selected_title: string;
    platform: string;
  }>;

  const sampleSize = rows.length;
  if (sampleSize === 0) {
    throw new Error('暂无已录入的发布数据指标，请先记录发布并录入真实/标明来源的复盘数据。');
  }

  const rankedByCollectRate = [...rows].sort((a, b) => {
    const ra = a.views > 0 ? a.collects / a.views : 0;
    const rb = b.views > 0 ? b.collects / b.views : 0;
    return rb - ra;
  });
  const top = rankedByCollectRate[0];
  const low = rankedByCollectRate[rankedByCollectRate.length - 1];
  const topRate = top.views > 0 ? `${((top.collects / top.views) * 100).toFixed(1)}%` : '分母为0无法计算';

  const sampleWarning =
    sampleSize < 3
      ? `样本量提示：当前仅统计到 ${sampleSize} 条发布数据（少于 3 条），以下观察仅作基线参考，不构成统计因果结论。`
      : `当前基于 ${sampleSize} 条真实/已标明来源的数据快照进行对比分析，建议每轮仅改变一个主要变量持续对照。`;

  const id = newId('ins');
  const titleFinding = `表现较优标题：「${top.selected_title || top.topic}」（收藏率 ${topRate}，曝光/阅读 ${top.views}，咨询 ${top.inquiries}）。`;
  const coverFinding = '建议优先保留带清晰场景/清单承诺的 3:4 封面，并对照实拍图与概念图的点击差异。';
  const topicFinding = `值得持续深挖主题：「${top.topic}」（所在平台：${top.platform}）。`;
  const weakFinding =
    sampleSize > 1
      ? `相对偏弱样本：「${low.selected_title || low.topic}」（收藏 ${low.collects} / 咨询 ${low.inquiries}），建议复核开头钩子与 CTA 清晰度。`
      : '目前仅有 1 条样本，需补充同平台对照帖后再评估弱势策略。';
  const nextActions = [
    `围绕「${top.topic}」延伸 2 个细分场景选题做 A/B 标题对照`,
    '检查评论区高频提问，将已核实答复补充进企业知识库 A/B 类',
    '持续满 7 天同口径记录曝光、收藏、有效咨询与转化数',
  ];

  db.prepare(
    `INSERT INTO review_insights (
      id, organization_id, sample_size, title_finding, cover_finding, topic_finding,
      weak_strategy_finding, next_round_actions_json, sample_warning
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    organizationId,
    sampleSize,
    titleFinding,
    coverFinding,
    topicFinding,
    weakFinding,
    JSON.stringify(nextActions),
    sampleWarning
  );

  logAgentStep({
    organizationId,
    runId: newId('revrun'),
    stepIndex: 1,
    roleName: '数据复盘 Agent',
    toolName: 'generate_data_review_insight',
    inputSummary: `分析 ${sampleSize} 条发布指标快照`,
    outputSummary: `${titleFinding} ${sampleWarning}`,
    status: 'completed',
    durationMs: Math.max(1, Date.now() - started),
  });

  return db.prepare('SELECT * FROM review_insights WHERE id = ?').get(id);
}

export function syncInsightToKnowledgeBase(organizationId: string, insightId: string) {
  requireOrgAccess(organizationId);
  const db = getDb();
  const ins = db
    .prepare('SELECT * FROM review_insights WHERE id = ? AND organization_id = ?')
    .get(insightId, organizationId) as Record<string, unknown> | undefined;
  if (!ins) throw new Error('复盘洞察记录不存在');

  const actions = JSON.parse(String(ins.next_round_actions_json || '[]')) as string[];
  const doc = createKnowledgeDocument({
    organizationId,
    category: 'E_EXPERIENCE',
    title: `复盘经验沉淀（样本数 ${ins.sample_size}）· ${new Date().toISOString().slice(0, 10)}`,
    content: `${ins.sample_warning}\n\n1. 标题表现：${ins.title_finding}\n2. 封面观察：${ins.cover_finding}\n3. 持续创作主题：${ins.topic_finding}\n4. 待优化项：${ins.weak_strategy_finding}\n5. 下轮优化动作：\n- ${actions.join('\n- ')}`,
    sourceType: 'manual',
    sourceRef: `数据复盘回流 (${insightId})`,
    verificationStatus: 'verified',
  }) as { id: string };

  db.prepare('UPDATE review_insights SET synced_to_kb_doc_id = ? WHERE id = ?').run(doc.id, insightId);

  // 同步写入专属 Agent 经验记忆
  const agt = db
    .prepare('SELECT experience_memory_json FROM organization_agents WHERE organization_id = ?')
    .get(organizationId) as { experience_memory_json: string } | undefined;
  if (agt) {
    const mem = JSON.parse(agt.experience_memory_json || '[]') as string[];
    mem.unshift(`[${new Date().toISOString().slice(0, 10)}] ${String(ins.title_finding)}`);
    db.prepare('UPDATE organization_agents SET experience_memory_json = ?, updated_at = datetime(\'now\') WHERE organization_id = ?').run(
      JSON.stringify(mem.slice(0, 12)),
      organizationId
    );
  }

  return { syncedDocumentId: doc.id };
}
