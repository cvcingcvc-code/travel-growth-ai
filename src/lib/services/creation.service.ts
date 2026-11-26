import { getDb } from '../db/client';
import { newId, requireOrgAccess, writeAuditLog } from '../db/tenant';
import { generateTextWithRegistry } from '../providers/registry';
import { searchKnowledge } from './knowledge.service';
import { getCompanyProfile } from './organization.service';

export interface GenerateTopicsInput {
  organizationId: string;
  productId?: string;
  targetPlatform?: string;
  targetAudience?: string;
  marketingGoal?: string;
}

export async function generateTopics(input: GenerateTopicsInput) {
  const profile = getCompanyProfile(input.organizationId);
  const orgName = String((profile.organization as { name: string }).name);
  const products = profile.products as Array<{ id: string; name: string; summary: string; verification_status: string }>;
  const product = products.find((p) => p.id === input.productId) ?? products[0];
  const knowledgeHits = searchKnowledge(
    input.organizationId,
    `${product?.name ?? ''} ${input.marketingGoal ?? '种草'} ${input.targetAudience ?? ''}`,
    { limit: 4 }
  );

  const aiRes = await generateTextWithRegistry({
    organizationId: input.organizationId,
    taskType: 'generate_topics',
    systemPrompt:
      '你是文旅内容营销策划专家。基于企业已核实知识库输出3个高转化营销选题，返回 JSON 数组，每项含 topic, angle, targetAudience, hookHint。严禁编造未核实的价格或政策。',
    userPrompt: `企业：${orgName}\n产品：${product?.name ?? '未指定'}\n平台：${input.targetPlatform ?? 'xiaohongshu'}\n参考知识：${knowledgeHits
      .map((k) => `[${k.category}:${k.verificationStatus}] ${k.title}: ${k.snippet}`)
      .join('\n')}`,
    testModeFallback: () =>
      JSON.stringify([
        {
          topic: `${product?.name ?? orgName}：周末短途逃离计划与真实体验清单`,
          angle: '痛点切入 + 昼夜双场景沉浸体验',
          targetAudience: input.targetAudience || '周边2小时都市白领与亲子家庭',
          hookHint: '逃离城市喧嚣，把两天交给山野与慢生活',
        },
        {
          topic: `去${orgName}前必看：交通、房型/票务与避坑核实指南`,
          angle: '实用攻略型 + 透明事实建立信任',
          targetAudience: '高意向决策期游客',
          hookHint: '不踩雷攻略：把时间留给风景本身',
        },
        {
          topic: `时令风物志：为什么这个季节最适合来${product?.name ?? orgName}`,
          angle: '季节限定情绪价值 + 在地文化记忆点',
          targetAudience: '美学与慢旅行爱好者',
          hookHint: '错过要等一年的限定山野风景',
        },
      ]),
  });

  let topics: unknown[] = [];
  try {
    const match = aiRes.content.match(/\[[\s\S]*\]/);
    topics = JSON.parse(match ? match[0] : aiRes.content);
  } catch {
    topics = [{ topic: aiRes.content.slice(0, 80), angle: 'AI 自由生成', targetAudience: '', hookHint: '' }];
  }

  return {
    topics,
    dataOrigin: aiRes.dataOrigin,
    knowledgeCitations: knowledgeHits.map((k) => ({
      documentId: k.documentId,
      title: k.title,
      category: k.category,
      verificationStatus: k.verificationStatus,
    })),
  };
}

export interface CreateAndGenerateInput {
  organizationId: string;
  productId?: string;
  strategyId?: string;
  topic?: string;
  targetPlatform?: string;
  targetAudience?: string;
  marketingGoal?: string;
  contentStyle?: string;
  visualRequirements?: string;
}

export interface ContentVersionRecord {
  id: string;
  version_number: number;
  selected_title: string;
  body_copy: string;
  [key: string]: unknown;
}

export interface ContentProjectWithVersions {
  id: string;
  organization_id: string;
  topic: string;
  target_platform: string;
  review_status: string;
  versions: ContentVersionRecord[];
  publications: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export function listContentProjects(organizationId: string): ContentProjectWithVersions[] {
  requireOrgAccess(organizationId);
  const db = getDb();
  const projects = db
    .prepare('SELECT * FROM content_projects WHERE organization_id = ? ORDER BY updated_at DESC')
    .all(organizationId) as unknown as Array<ContentProjectWithVersions>;

  return projects.map((p) => {
    const versions = db
      .prepare(
        'SELECT * FROM content_versions WHERE project_id = ? AND organization_id = ? ORDER BY version_number DESC'
      )
      .all(String(p.id), organizationId) as unknown as ContentVersionRecord[];
    const publications = db
      .prepare('SELECT * FROM publications WHERE project_id = ? AND organization_id = ? ORDER BY published_at DESC')
      .all(String(p.id), organizationId) as unknown as Array<Record<string, unknown>>;
    return { ...p, versions, publications };
  });
}

export async function createCampaignAndGenerate(input: CreateAndGenerateInput) {
  const profile = getCompanyProfile(input.organizationId);
  const orgName = String((profile.organization as { name: string }).name);
  const products = profile.products as Array<{
    id: string;
    name: string;
    summary: string;
    price_info: string;
    address: string;
    opening_hours: string;
    verification_status: string;
  }>;
  const product = products.find((p) => p.id === input.productId) ?? products[0];

  const db = getDb();
  const strategy = input.strategyId
    ? (db
        .prepare('SELECT * FROM marketing_strategies WHERE id = ? AND organization_id = ?')
        .get(input.strategyId, input.organizationId) as Record<string, string> | undefined)
    : undefined;

  const query = `${input.topic ?? ''} ${product?.name ?? ''} ${input.marketingGoal ?? ''} ${input.targetPlatform ?? ''}`;
  const knowledgeHits = searchKnowledge(input.organizationId, query, { limit: 5 });

  const unverifiedWarnings: string[] = [];
  if (product && product.verification_status !== 'verified') {
    unverifiedWarnings.push(`产品「${product.name}」当前为待核实状态，价格/地址/营业时间不可写死，已标注[待核实]。`);
  }
  for (const k of knowledgeHits) {
    if (k.verificationStatus !== 'verified') {
      unverifiedWarnings.push(`引用文档「${k.title}」尚未核实，请人工复核后再发布。`);
    }
  }

  const topicTitle = input.topic?.trim() || `${product?.name ?? orgName} · ${input.marketingGoal ?? '秋季种草'}方案`;

  const systemPrompt = `你是 TravelGrowth AI 文旅内容创作总监。
必须严格遵守：
1. 优先依据已核实企业知识库创作；价格、地址、营业时间、活动政策若未核实，必须明确标注 [待核实]，严禁编造！
2. 严禁把 AI 概念图描述为真实景区实景照片，优先建议使用企业实景素材。
3. 输出严格 JSON 对象，字段包括：
   titles (3个标题字符串数组), selectedTitle (字符串), bodyCopy (完整正文), coverDesignNote (封面设计说明), carouselPlan (数组，每项含 page, title, visual, copy), imagePrompts (字符串数组，明确标注仅作概念参考), hashtags (字符串数组), conversionCta (转化引导)。`;

  const userPrompt = `企业：${orgName}
目标平台：${input.targetPlatform ?? 'xiaohongshu'}
目标客群：${input.targetAudience ?? '周末短途度假客群'}
营销目的：${input.marketingGoal ?? '种草引流'}
内容风格：${input.contentStyle ?? '松弛感自然叙事'}
视觉要求：${input.visualRequirements ?? '墨绿与米白自然色调，实景优先'}
产品信息：${product ? `${product.name}（核实状态：${product.verification_status}，价格：${product.price_info}，地址：${product.address}，时间：${product.opening_hours}）` : '未指定'}
参考策略：${strategy ? `${strategy.title} | 钩子：${strategy.hook_pattern} | 结构：${strategy.structure_template}` : '无'}
检索到的企业知识：\n${knowledgeHits.map((k) => `- [${k.category} | ${k.verificationStatus}] ${k.title}: ${k.snippet}`).join('\n')}`;

  const aiRes = await generateTextWithRegistry({
    organizationId: input.organizationId,
    taskType: 'generate_copy_and_visual',
    systemPrompt,
    userPrompt,
    testModeFallback: () => {
      const priceLine =
        product?.verification_status === 'verified'
          ? product.price_info
          : '[待核实：请与企业管家/官方渠道确认最新价格]';
      const addrLine =
        product?.verification_status === 'verified'
          ? product.address
          : '[待核实：请确认具体集合/门店地址]';
      return JSON.stringify({
        titles: [
          `【测试模式】${topicTitle}：周末躲进真实风景里的慢生活`,
          `去${orgName}之前，这份实景体验与核实清单先收好`,
          `不用做复杂攻略！${product?.name ?? orgName} 两天一夜怎么玩最松弛`,
        ],
        selectedTitle: `${topicTitle}：周末躲进真实风景里的慢生活`,
        bodyCopy: `【测试模式生成文案 — 基于企业知识库检索结果组装】\n\n最近很多人问周末短途去哪里不累又有质感，这次把「${orgName}」的「${product?.name ?? '核心体验'}」整理成一份可直接照搬的慢旅行清单。\n\n🌿 核心亮点：\n${product?.summary || '融合在地自然风光与慢节奏体验，适合周末放空。'}\n\n📌 实用信息（严格遵循企业知识库核实状态）：\n- 地点：${addrLine}\n- 参考价格：${priceLine}\n- 开放/入住时间：${product?.opening_hours || '[待核实]'}\n\n💡 温馨提示：配图请优先选用企业素材库中的实景照片；如使用 AI 概念图仅作氛围参考，须明确标注非实景。`,
        coverDesignNote: '采用 3:4 竖版企业实景照片为主体，画面保留自然留白区域，标题使用简洁衬线体或黑体，避免夸张渐变贴纸。',
        carouselPlan: [
          { page: 1, title: '封面：核心实景氛围', visual: '企业自有实景照片（优先）', copy: topicTitle },
          { page: 2, title: '痛点与出发理由', visual: '交通/沿途风景实拍', copy: '告别赶路式打卡，把时间留给真实体验' },
          { page: 3, title: '产品核心体验切片', visual: '细节特写（茶席/手作/汤池）', copy: product?.summary || '沉浸式在地体验细节' },
          { page: 4, title: '实用攻略与核实清单', visual: '米白底色信息卡片', copy: `价格/时间：${priceLine}` },
        ],
        imagePrompts: [
          `【AI 概念图提示词 - 仅作排版参考，非真实景区照片】${orgName}，低饱和墨绿与米白色调，自然光影下的东方文旅空间，安静松弛感。`,
        ],
        hashtags: [`#${orgName.replace(/[（(].*?[）)]/g, '')}`, '#文旅种草', '#周末去哪儿', '#真实风景'],
        conversionCta: '评论区留言出行日期，获取官方核实后的最新房态/票务与交通指引。',
      });
    },
  });

  let parsed: Record<string, unknown>;
  try {
    const m = aiRes.content.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(m ? m[0] : aiRes.content);
  } catch {
    parsed = {
      titles: [topicTitle],
      selectedTitle: topicTitle,
      bodyCopy: aiRes.content,
      coverDesignNote: '建议使用企业实景图',
      carouselPlan: [],
      imagePrompts: [],
      hashtags: ['#文旅营销'],
      conversionCta: '欢迎留言咨询官方最新政策',
    };
  }

  const projectId = newId('proj');
  const versionId = newId('ver');

  db.prepare(
    `INSERT INTO content_projects (id, organization_id, product_id, strategy_id, topic, target_platform, target_audience, marketing_goal, content_style, visual_requirements, review_status, current_version_id, is_demo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, 0)`
  ).run(
    projectId,
    input.organizationId,
    product?.id ?? null,
    strategy?.id ?? null,
    topicTitle,
    input.targetPlatform ?? 'xiaohongshu',
    input.targetAudience ?? '周末短途客群',
    input.marketingGoal ?? '种草引流',
    input.contentStyle ?? '松弛感自然叙事',
    input.visualRequirements ?? '',
    versionId
  );

  const riskCheck = {
    passed: unverifiedWarnings.length === 0,
    warnings: unverifiedWarnings,
    checkedAt: new Date().toISOString(),
  };

  db.prepare(
    `INSERT INTO content_versions (
      id, organization_id, project_id, version_number, titles_json, selected_title, body_copy,
      cover_design_note, carousel_plan_json, image_prompts_json, hashtags_json, conversion_cta,
      knowledge_citations_json, risk_check_json, data_origin
    ) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    versionId,
    input.organizationId,
    projectId,
    JSON.stringify(parsed.titles ?? [topicTitle]),
    String(parsed.selectedTitle ?? topicTitle),
    String(parsed.bodyCopy ?? ''),
    String(parsed.coverDesignNote ?? ''),
    JSON.stringify(parsed.carouselPlan ?? []),
    JSON.stringify(parsed.imagePrompts ?? []),
    JSON.stringify(parsed.hashtags ?? []),
    String(parsed.conversionCta ?? ''),
    JSON.stringify(
      knowledgeHits.map((k) => ({
        documentId: k.documentId,
        title: k.title,
        category: k.category,
        verificationStatus: k.verificationStatus,
      }))
    ),
    JSON.stringify(riskCheck),
    aiRes.dataOrigin
  );

  writeAuditLog({
    organizationId: input.organizationId,
    action: 'creation.generate',
    targetType: 'content_project',
    targetId: projectId,
    detail: { topic: topicTitle, dataOrigin: aiRes.dataOrigin },
  });

  return listContentProjects(input.organizationId).find((p) => p.id === projectId);
}

export function saveDraftVersion(params: {
  organizationId: string;
  projectId: string;
  selectedTitle: string;
  bodyCopy: string;
  coverDesignNote?: string;
  carouselPlan?: unknown[];
  conversionCta?: string;
  reviewStatus?: 'draft' | 'pending_review' | 'approved' | 'rejected';
}) {
  requireOrgAccess(params.organizationId);
  const db = getDb();
  const proj = db
    .prepare('SELECT * FROM content_projects WHERE id = ? AND organization_id = ?')
    .get(params.projectId, params.organizationId) as Record<string, unknown> | undefined;
  if (!proj) throw new Error('创作项目不存在或无权访问');

  const latest = db
    .prepare(
      'SELECT * FROM content_versions WHERE project_id = ? AND organization_id = ? ORDER BY version_number DESC LIMIT 1'
    )
    .get(params.projectId, params.organizationId) as Record<string, unknown> | undefined;

  const nextVerNum = Number(latest?.version_number ?? 0) + 1;
  const newVerId = newId('ver');

  db.prepare(
    `INSERT INTO content_versions (
      id, organization_id, project_id, version_number, titles_json, selected_title, body_copy,
      cover_design_note, carousel_plan_json, image_prompts_json, hashtags_json, conversion_cta,
      knowledge_citations_json, risk_check_json, data_origin
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    newVerId,
    params.organizationId,
    params.projectId,
    nextVerNum,
    String(latest?.titles_json ?? JSON.stringify([params.selectedTitle])),
    params.selectedTitle,
    params.bodyCopy,
    params.coverDesignNote ?? String(latest?.cover_design_note ?? ''),
    params.carouselPlan ? JSON.stringify(params.carouselPlan) : String(latest?.carousel_plan_json ?? '[]'),
    String(latest?.image_prompts_json ?? '[]'),
    String(latest?.hashtags_json ?? '[]'),
    params.conversionCta ?? String(latest?.conversion_cta ?? ''),
    String(latest?.knowledge_citations_json ?? '[]'),
    String(latest?.risk_check_json ?? '{}'),
    latest?.data_origin === 'external_agent' ? 'external_agent' : 'real'
  );

  db.prepare(
    `UPDATE content_projects
     SET current_version_id = ?, review_status = ?, updated_at = datetime('now')
     WHERE id = ? AND organization_id = ?`
  ).run(newVerId, params.reviewStatus ?? 'draft', params.projectId, params.organizationId);

  writeAuditLog({
    organizationId: params.organizationId,
    action: 'creation.save_draft',
    targetType: 'content_project',
    targetId: params.projectId,
    detail: { versionId: newVerId, versionNumber: nextVerNum, reviewStatus: params.reviewStatus ?? 'draft' },
  });

  return listContentProjects(params.organizationId).find((p) => p.id === params.projectId);
}

export function recordHumanPublication(params: {
  organizationId: string;
  projectId: string;
  versionId: string;
  platform: string;
  publishedUrl?: string;
  humanConfirmed: boolean;
}) {
  requireOrgAccess(params.organizationId);
  if (!params.humanConfirmed) {
    throw new Error('安全规则：默认不允许自动发布，必须经过人工确认后方可记录发布！');
  }
  const db = getDb();
  const pubId = newId('pub');
  db.prepare(
    `INSERT INTO publications (id, organization_id, project_id, version_id, platform, published_url, human_confirmed)
     VALUES (?, ?, ?, ?, ?, ?, 1)`
  ).run(pubId, params.organizationId, params.projectId, params.versionId, params.platform, params.publishedUrl ?? '');

  db.prepare(
    `UPDATE content_projects SET review_status = 'published_recorded', updated_at = datetime('now')
     WHERE id = ? AND organization_id = ?`
  ).run(params.projectId, params.organizationId);

  writeAuditLog({
    organizationId: params.organizationId,
    action: 'publication.record',
    targetType: 'publication',
    targetId: pubId,
    detail: { platform: params.platform, publishedUrl: params.publishedUrl ?? '' },
  });

  return db.prepare('SELECT * FROM publications WHERE id = ?').get(pubId);
}

export function analyzePerformance(organizationId: string) {
  requireOrgAccess(organizationId);
  const db = getDb();
  const metrics = db
    .prepare('SELECT * FROM performance_metrics WHERE organization_id = ? ORDER BY recorded_at DESC')
    .all(organizationId);
  const pubs = db
    .prepare('SELECT * FROM publications WHERE organization_id = ? ORDER BY published_at DESC')
    .all(organizationId);
  return {
    publicationCount: pubs.length,
    metricsCount: metrics.length,
    publications: pubs,
    metrics,
    note: metrics.length === 0 ? '暂无已录入的真实发布复盘数据，请发布并人工确认后录入。' : '已汇总真实复盘数据',
  };
}
