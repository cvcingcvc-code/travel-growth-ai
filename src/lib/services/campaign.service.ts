import { getDb } from '../db/client';
import { newId, requireOrgAccess, writeAuditLog } from '../db/tenant';
import { generateTextWithRegistry } from '../providers/registry';
import { getCompanyProfile } from './organization.service';
import { searchKnowledge } from './knowledge.service';
import { listContentCases } from './analysis.service';
import { logAgentStep } from './agent-orchestrator.service';

export function listCampaigns(organizationId: string) {
  requireOrgAccess(organizationId);
  const db = getDb();
  return db
    .prepare('SELECT * FROM marketing_campaigns WHERE organization_id = ? ORDER BY updated_at DESC')
    .all(organizationId);
}

export async function generateMarketingCampaign(params: {
  organizationId: string;
  productId?: string;
  title?: string;
  marketingGoal?: string;
  targetPlatforms?: string[];
}) {
  requireOrgAccess(params.organizationId);
  const runId = newId('crun');
  const started = Date.now();
  const profile = getCompanyProfile(params.organizationId);
  const orgName = String((profile.organization as { name: string }).name);
  const products = profile.products as Array<{
    id: string;
    name: string;
    summary: string;
    price_info: string;
    verification_status: string;
  }>;
  const product = products.find((p) => p.id === params.productId) ?? products[0];
  const knowledgeHits = searchKnowledge(
    params.organizationId,
    `${product?.name ?? ''} ${params.marketingGoal ?? '营销方案 策略'}`,
    { limit: 5 }
  );
  const cases = listContentCases(params.organizationId);
  const platforms = params.targetPlatforms?.length ? params.targetPlatforms : ['小红书', '抖音', '微信公众号'];

  const unverifiedItems: string[] = [];
  if (product && product.verification_status !== 'verified') {
    unverifiedItems.push(`产品「${product.name}」的价格、开放时间或履约规则待核实`);
  }
  for (const h of knowledgeHits) {
    if (h.verificationStatus !== 'verified') {
      unverifiedItems.push(`知识文档「${h.title}」待人工确认`);
    }
  }

  const aiRes = await generateTextWithRegistry({
    organizationId: params.organizationId,
    taskType: 'generate_marketing_campaign',
    systemPrompt:
      '你是资深企业营销策划总监。请基于企业知识库、产品和同行分析生成完整营销方案，严禁编造未核实价格或数据。输出 JSON 对象，包含 title, targetAudienceNeeds, differentiatedSellingPoints, topicPool(数组), platformStrategy(对象), plan7d(数组，每项含day/topic/platform/goal), plan30d(数组，每项含week/focus/deliverable), visualDirection, videoDirection, conversionGuide。',
    userPrompt: `企业：${orgName}\n产品：${product?.name ?? '未指定'}（${product?.summary ?? ''}）\n目标：${params.marketingGoal ?? '提升收藏、咨询与转化'}\n平台：${platforms.join('、')}\n参考案例数：${cases.length}\n知识库命中：${knowledgeHits.map((k) => k.title).join('；')}`,
    testModeFallback: () =>
      JSON.stringify({
        title: params.title?.trim() || `${orgName} × ${product?.name ?? '核心产品'} · 全链路增长营销方案`,
        targetAudienceNeeds: '核心客群关注周末短途效率、真实体验不踩坑、清晰行前清单与高性价比决策依据。',
        differentiatedSellingPoints: `${product?.name ?? orgName}：结合企业已核实亮点（${product?.summary || '在地真实体验'}），弱化浮夸宣传，用可行动攻略与真实细节建立信任。`,
        topicPool: [
          `周末半日/两日慢游清单：${product?.name ?? orgName} 怎么安排最松弛`,
          `行前必看避坑指南：交通、选票/房型与预约核对清单`,
          `在地文化与细节故事：为什么老客更看重这 3 个体验点`,
          `双人/亲子实测路线：不用赶景点的舒适节奏`,
        ],
        platformStrategy: {
          小红书: '主打 3:4 清单图文与场景攻略，核心追踪收藏率与评论区有效咨询',
          抖音: '主打 15-30 秒实景沉浸短视频与行程对比，引导评论区关键词咨询',
          微信公众号: '沉淀深度行前指南、官方活动公告与私域预约承接',
        },
        plan7d: [
          { day: 'Day 1', topic: '核心体验清单图文首发（建立收藏基线）', platform: '小红书', goal: '收藏率' },
          { day: 'Day 3', topic: '行前避坑与选品/选票决策指南', platform: '小红书', goal: '有效咨询率' },
          { day: 'Day 5', topic: '沉浸式实景切片短视频', platform: '抖音', goal: '完播与互动' },
          { day: 'Day 7', topic: '首周数据复盘与高频问答汇总', platform: '微信公众号', goal: '信任转化' },
        ],
        plan30d: [
          { week: '第 1 周', focus: '内容基线测试', deliverable: '完成 3-5 篇不同角度图文测试，记录 M01/M02 基线' },
          { week: '第 2 周', focus: '放大高收藏选题', deliverable: '基于首周真实数据迭代 2 组高表现封面与标题' },
          { week: '第 3 周', focus: '咨询与转化承接', deliverable: '完善私信话术与已核实商品卡/预约入口' },
          { week: '第 4 周', focus: '月度复盘与知识回流', deliverable: '沉淀有效经验回写企业知识库 E 类，开启下轮优化' },
        ],
        visualDirection: '优先使用企业授权实拍；概念示意与清单图统一 3:4 竖幅、简洁克制排版并明确标注非实景。',
        videoDirection: '前 3 秒给真实环境或痛点提问，中段展示 3 个可验证体验细节，结尾给出明确行前核对引导。',
        conversionGuide: '收藏型内容给全清单；咨询型内容引导评论/私信说明出行时间与人数；交易型内容在价格与入口核实后再挂商品卡。',
      }),
  });

  let parsed: Record<string, unknown>;
  try {
    const m = aiRes.content.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(m ? m[0] : aiRes.content);
  } catch {
    parsed = {
      title: params.title?.trim() || `${orgName} 营销方案`,
      targetAudienceNeeds: aiRes.content.slice(0, 200),
      differentiatedSellingPoints: product?.summary || '核心产品卖点',
      topicPool: [],
      platformStrategy: {},
      plan7d: [],
      plan30d: [],
      visualDirection: '实景优先',
      videoDirection: '实景短片',
      conversionGuide: '人工审核后引导咨询',
    };
  }

  const db = getDb();
  const id = newId('camp');
  db.prepare(
    `INSERT INTO marketing_campaigns (
      id, organization_id, product_id, version_number, title, marketing_goal,
      target_audience_needs, differentiated_selling_points, topic_pool_json,
      platform_strategy_json, plan_7d_json, plan_30d_json, visual_direction,
      video_direction, conversion_guide, required_assets_and_unverified_json,
      approval_status, data_origin
    ) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_approval', ?)`
  ).run(
    id,
    params.organizationId,
    product?.id ?? null,
    String(parsed.title ?? `${orgName} 营销方案`),
    params.marketingGoal ?? '提升收藏、咨询与下单转化',
    String(parsed.targetAudienceNeeds ?? ''),
    String(parsed.differentiatedSellingPoints ?? ''),
    JSON.stringify(parsed.topicPool ?? []),
    JSON.stringify(parsed.platformStrategy ?? {}),
    JSON.stringify(parsed.plan7d ?? []),
    JSON.stringify(parsed.plan30d ?? []),
    String(parsed.visualDirection ?? ''),
    String(parsed.videoDirection ?? ''),
    String(parsed.conversionGuide ?? ''),
    JSON.stringify(unverifiedItems),
    aiRes.dataOrigin
  );

  logAgentStep({
    organizationId: params.organizationId,
    runId,
    stepIndex: 1,
    roleName: '营销策划 Agent',
    toolName: 'generate_marketing_campaign',
    inputSummary: `产品：${product?.name ?? '通用'}，平台：${platforms.join('/')}`,
    outputSummary: `已生成营销方案「${String(parsed.title ?? '')}」，识别待核实项 ${unverifiedItems.length} 条`,
    status: 'completed',
    durationMs: Math.max(1, Date.now() - started),
  });

  writeAuditLog({
    organizationId: params.organizationId,
    action: 'campaign.generate',
    targetType: 'marketing_campaign',
    targetId: id,
    detail: { title: parsed.title, dataOrigin: aiRes.dataOrigin },
  });

  return db.prepare('SELECT * FROM marketing_campaigns WHERE id = ?').get(id);
}

export function updateCampaign(params: {
  organizationId: string;
  campaignId: string;
  title?: string;
  marketingGoal?: string;
  differentiatedSellingPoints?: string;
  conversionGuide?: string;
  approvalStatus?: 'draft' | 'pending_approval' | 'approved' | 'archived';
}) {
  requireOrgAccess(params.organizationId);
  const db = getDb();
  const cur = db
    .prepare('SELECT * FROM marketing_campaigns WHERE id = ? AND organization_id = ?')
    .get(params.campaignId, params.organizationId) as Record<string, unknown> | undefined;
  if (!cur) throw new Error('营销方案不存在或无权访问');

  const nextVer = Number(cur.version_number ?? 1) + 1;
  db.prepare(
    `UPDATE marketing_campaigns
     SET title = ?, marketing_goal = ?, differentiated_selling_points = ?, conversion_guide = ?,
         approval_status = ?, version_number = ?, updated_at = datetime('now')
     WHERE id = ? AND organization_id = ?`
  ).run(
    String(params.title ?? cur.title ?? ''),
    String(params.marketingGoal ?? cur.marketing_goal ?? ''),
    String(params.differentiatedSellingPoints ?? cur.differentiated_selling_points ?? ''),
    String(params.conversionGuide ?? cur.conversion_guide ?? ''),
    String(params.approvalStatus ?? cur.approval_status ?? 'draft'),
    nextVer,
    params.campaignId,
    params.organizationId
  );

  writeAuditLog({
    organizationId: params.organizationId,
    action: 'campaign.update',
    targetType: 'marketing_campaign',
    targetId: params.campaignId,
    detail: { version: nextVer, approvalStatus: params.approvalStatus ?? cur.approval_status },
  });

  return db.prepare('SELECT * FROM marketing_campaigns WHERE id = ?').get(params.campaignId);
}
