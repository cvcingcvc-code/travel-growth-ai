import { describe, it, expect, beforeEach } from 'vitest';
import { resetDbForTests } from '@/lib/db/client';
import { seedDatabaseIfEmpty } from '@/lib/db/seed';
import {
  createOrganization,
  createProduct,
  getCompanyProfile,
  listProducts,
} from '@/lib/services/organization.service';
import {
  createKnowledgeDocument,
  searchKnowledge,
} from '@/lib/services/knowledge.service';
import {
  analyzeContentCase,
  createContentCase,
  saveStrategyCard,
} from '@/lib/services/analysis.service';
import {
  createCampaignAndGenerate,
  generateTopics,
  listContentProjects,
  recordHumanPublication,
  saveDraftVersion,
} from '@/lib/services/creation.service';
import { createAsset } from '@/lib/services/asset.service';
import { updateProviderConfig, validateLocalEndpointSecurity } from '@/lib/providers/registry';
import { ProviderUnconfiguredError } from '@/lib/providers/types';

describe('TravelGrowth AI 第一阶段 P0 完整验收测试', () => {
  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
    resetDbForTests(':memory:');
    seedDatabaseIfEmpty(true);
  });

  it('1~9. 完整业务闭环：创建企业 -> 录入产品 -> 导入案例 -> 11维分析保存策略 -> 检索知识 -> 生成选题与文案 -> 编辑保存草稿', async () => {
    // 1. 创建企业工作空间
    const createdOrg = createOrganization({
      name: '苍山洱海云舍（验收测试企业）',
      industryType: 'homestay',
      location: '云南大理',
      description: '面朝洱海的慢生活设计民宿',
    });
    const orgId = (createdOrg.organization as { id: string }).id;
    expect(orgId).toMatch(/^org_/);

    // 2. 录入文旅产品
    const prod = createProduct({
      organizationId: orgId,
      name: '海景露台茶室大床房',
      summary: '直面苍山洱海日出，含双人白族三道茶体验',
      priceInfo: '¥1,280/晚起',
      address: '大理古城才村码头旁',
      openingHours: '14:00入住 / 12:00退房',
      verificationStatus: 'verified',
    }) as { id: string; name: string };
    expect(prod.name).toBe('海景露台茶室大床房');
    expect(listProducts(orgId).length).toBe(1);

    // 录入企业知识库并检索
    createKnowledgeDocument({
      organizationId: orgId,
      category: 'A_FACTS',
      title: '云舍交通与白族三道茶介绍',
      content: '距离大理站驾车约30分钟，每日下午3点提供白族三道茶体验，露台可看洱海日出。',
      verificationStatus: 'verified',
    });
    const hits = searchKnowledge(orgId, '洱海 日出 三道茶');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].title).toContain('三道茶');

    // 3. 导入有来源的市场案例
    const cCase = createContentCase({
      organizationId: orgId,
      platform: 'xiaohongshu',
      title: '在大理才村醒来，推开窗就是洱海日出',
      sourceUrl: 'https://example.com/dali-case',
      rawText: '早上六点半在露台看日出，下午喝白族三道茶，完全不想回城市上班。',
    }) as { id: string };

    // 4. 完成案例分析并保存策略卡片
    const analysis = (await analyzeContentCase(orgId, cCase.id)) as {
      id: string;
      title_hook: string;
      content_structure: string;
      data_origin: string;
    };
    expect(analysis.data_origin).toBe('test_mode');
    const strategy = saveStrategyCard({
      organizationId: orgId,
      caseAnalysisId: analysis.id,
      title: '洱海日出+三道茶慢生活策略',
      hookPattern: analysis.title_hook,
      structureTemplate: analysis.content_structure,
    }) as { id: string };
    expect(strategy.id).toMatch(/^strat_/);

    // 5~6. 基于企业资料生成营销选题
    const topicRes = await generateTopics({
      organizationId: orgId,
      productId: prod.id,
      targetPlatform: 'xiaohongshu',
    });
    expect(topicRes.topics.length).toBeGreaterThan(0);
    expect(topicRes.knowledgeCitations.length).toBeGreaterThan(0);

    // 7. 生成文案及图文创作方案
    const project = (await createCampaignAndGenerate({
      organizationId: orgId,
      productId: prod.id,
      strategyId: strategy.id,
      topic: '大理才村洱海日出私享茶室',
      targetPlatform: 'xiaohongshu',
    })) as { id: string; versions: Array<{ id: string; version_number: number; body_copy: string }> };
    expect(project.versions.length).toBe(1);
    expect(project.versions[0].body_copy).toContain('海景露台茶室大床房');

    // 8. 编辑并保存草稿新版本
    const updatedProj = saveDraftVersion({
      organizationId: orgId,
      projectId: project.id,
      selectedTitle: '【人工润色版】推开窗就是洱海日出',
      bodyCopy: '人工编辑后的最终文案正文，事实已核实。',
      reviewStatus: 'pending_review',
    }) as { review_status: string; versions: Array<{ version_number: number; selected_title: string }> };
    expect(updatedProj.review_status).toBe('pending_review');
    expect(updatedProj.versions.length).toBe(2);
    expect(updatedProj.versions[0].version_number).toBe(2);

    // 9. 验证持久化可读回
    const reloaded = listContentProjects(orgId);
    expect(reloaded[0].versions[0].selected_title).toBe('【人工润色版】推开窗就是洱海日出');
  });

  it('10. 切换企业后严禁访问其他企业的私有知识与数据', () => {
    const orgA = getCompanyProfile('org_demo_songjian');
    const orgB = getCompanyProfile('org_demo_qingcheng');
    expect((orgA.organization as { id: string }).id).toBe('org_demo_songjian');
    expect((orgB.organization as { id: string }).id).toBe('org_demo_qingcheng');

    // 在松间隐庐中检索云溪古镇机密暗号，必须返回 0 条
    const crossHits = searchKnowledge('org_demo_songjian', 'YUNXI-2026');
    expect(crossHits.length).toBe(0);

    // 在云溪古镇中检索，才能命中
    const validHits = searchKnowledge('org_demo_qingcheng', 'YUNXI-2026');
    expect(validHits.length).toBe(1);
  });

  it('11. 未配置模型且关闭测试模式时，正确抛出未配置错误与指引', async () => {
    updateProviderConfig({
      organizationId: 'org_demo_songjian',
      capability: 'text',
      provider: 'openai',
      modelName: 'gpt-4o-mini',
      allowTestMode: false,
    });

    await expect(
      generateTopics({ organizationId: 'org_demo_songjian' })
    ).rejects.toBeInstanceOf(ProviderUnconfiguredError);
  });

  it('安全合规红线：禁止 AI 概念图冒充实景、禁止未确认自动发布', () => {
    expect(() =>
      createAsset({
        organizationId: 'org_demo_songjian',
        title: 'AI 生成竹林图',
        category: 'real_scenic',
        fileUrl: '/tmp/ai.png',
        sourceOrigin: 'AI',
        copyrightStatus: 'owned',
        isAiGenerated: true,
      })
    ).toThrow(/AI 生成的概念图不得被标记为真实景区实景照片/);

    expect(() =>
      recordHumanPublication({
        organizationId: 'org_demo_songjian',
        projectId: 'proj_1',
        versionId: 'ver_1',
        platform: 'xiaohongshu',
        humanConfirmed: false,
      })
    ).toThrow(/必须经过人工确认/);

    expect(() =>
      validateLocalEndpointSecurity('ollama', 'https://public-ollama.example.com')
    ).toThrow(/禁止将无认证的本地模型服务/);
  });
});
