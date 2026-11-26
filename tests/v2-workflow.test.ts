import { describe, it, expect, beforeEach } from 'vitest';
import { resetDbForTests } from '@/lib/db/client';
import { seedDatabaseIfEmpty } from '@/lib/db/seed';
import { completeEnterpriseOnboarding } from '@/lib/services/onboarding.service';
import {
  getAgentWorkspaceState,
  runOrchestratorDiagnostic,
} from '@/lib/services/agent-orchestrator.service';
import {
  generateMarketingCampaign,
  updateCampaign,
} from '@/lib/services/campaign.service';
import {
  createCampaignAndGenerate,
  recordHumanPublication,
} from '@/lib/services/creation.service';
import {
  createSocialAccount,
  generateDataReviewInsight,
  recordPerformanceMetric,
  syncInsightToKnowledgeBase,
} from '@/lib/services/review.service';
import { searchKnowledge } from '@/lib/services/knowledge.service';
import { buildZipBuffer } from '@/lib/utils/zip';

describe('TravelGrowth AI 2.0 — 企业营销智能体端到端业务闭环验收', () => {
  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
    resetDbForTests(':memory:');
    seedDatabaseIfEmpty(true);
  });

  it('完整 2.0 闭环：6步入驻 -> 自动专属Agent -> 总控编排 -> 营销方案审批 -> 内容生成 -> 发布与ZIP导出 -> 数据复盘回流知识库', async () => {
    // 1. 6步企业入驻
    const onboard = completeEnterpriseOnboarding({
      companyName: '青岚谷文旅（2.0 演示企业）',
      industryType: 'scenic_spot',
      location: '浙江临安',
      description: '主打溪谷轻徒步与非遗竹编体验的周末短途景区',
      mainBusiness: '景区门票、联票、非遗手作体验',
      isDemo: true,
      importedMaterials: [
        { title: '青岚谷交通指引.md', content: '杭州西站出发自驾约1.2小时可达，景区入口有免费停车场。', sourceType: 'markdown' },
      ],
      brandPositioning: '杭州1.2小时溪谷轻徒步与非遗手作目的地',
      brandStyle: '真实克制、自然治愈',
      targetAudiences: ['杭州周末年轻人', '亲子家庭'],
      product: {
        name: '青岚谷徒步+竹编体验联票',
        summary: '含主景区门票与非遗竹编工坊1小时体验',
        priceInfo: '¥158/人（演示已核实）',
        verificationStatus: 'verified',
      },
      confirmedMarketingDirection: '以小红书半日慢游清单建立收藏基线，引导有效咨询',
    });

    const orgId = onboard.organizationId;
    expect(orgId).toMatch(/^org_/);

    // 2. 自动生成专属营销 Agent 并执行真实总控编排
    const diag = runOrchestratorDiagnostic(orgId, '制定青岚谷首周小红书增长计划');
    expect(diag.steps.length).toBeGreaterThanOrEqual(4);
    const agentState = getAgentWorkspaceState(orgId);
    expect((agentState.agent as { agent_name: string }).agent_name).toContain('青岚谷文旅');

    // 3. 自动生成营销方案并审批通过
    const camp = (await generateMarketingCampaign({
      organizationId: orgId,
      productId: (onboard.product as { id: string }).id,
      marketingGoal: '提升收藏率与私信咨询',
    })) as { id: string; version_number: number };
    expect(camp.id).toMatch(/^camp_/);

    const approved = updateCampaign({
      organizationId: orgId,
      campaignId: camp.id,
      approvalStatus: 'approved',
    }) as { approval_status: string; version_number: number };
    expect(approved.approval_status).toBe('approved');
    expect(approved.version_number).toBe(2);

    // 4. 内容生产 + ZIP 发布包构建
    const project = (await createCampaignAndGenerate({
      organizationId: orgId,
      productId: (onboard.product as { id: string }).id,
      topic: '杭州1.2h溪谷轻徒步+竹编半日清单',
      targetPlatform: 'xiaohongshu',
    }))!;
    const zip = buildZipBuffer([
      { name: 'copy.txt', data: Buffer.from(project.versions[0].body_copy, 'utf8') },
    ]);
    // Standard PKZIP header signature PK\x03\x04
    expect(zip.subarray(0, 4).toString('hex')).toBe('504b0304');

    // 5. 社媒账号 + 人工确认发布 + 录入标明来源的数据 + 复盘分析 + 回流知识库
    createSocialAccount({
      organizationId: orgId,
      platform: 'xiaohongshu',
      accountName: '青岚谷官方号',
    });

    const pub = recordHumanPublication({
      organizationId: orgId,
      projectId: project.id,
      versionId: project.versions[0].id,
      platform: 'xiaohongshu',
      publishedUrl: 'https://example.com/xhs-demo-post',
      humanConfirmed: true,
    }) as { id: string };

    recordPerformanceMetric({
      organizationId: orgId,
      publicationId: pub.id,
      views: 1850,
      likes: 120,
      collects: 215,
      comments: 26,
      inquiries: 14,
      bookings: 4,
      dataSourceLabel: '小红书后台导出（演示样本）',
    });

    const insight = generateDataReviewInsight(orgId) as {
      id: string;
      sample_size: number;
      sample_warning: string;
    };
    expect(insight.sample_size).toBe(1);
    expect(insight.sample_warning).toContain('样本量提示');

    const synced = syncInsightToKnowledgeBase(orgId, insight.id);
    expect(synced.syncedDocumentId).toMatch(/^kdoc_/);

    // 验证知识库已能检索回流经验
    const kbHits = searchKnowledge(orgId, '复盘经验沉淀 标题表现', { category: 'E_EXPERIENCE' });
    expect(kbHits.length).toBeGreaterThan(0);
  });
});
