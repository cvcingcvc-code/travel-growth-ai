import crypto from 'node:crypto';
import { getDb } from './client';
import { writeAuditLog } from './tenant';
import { createKnowledgeDocument } from '../services/knowledge.service';
import { ingestManualIntelligence } from '../services/intelligence.service';
import { createContentCase, saveStrategyCard } from '../services/analysis.service';
import { createAsset } from '../services/asset.service';

export function importShanhaiShiguangDemo() {
  const db = getDb();

  const orgId = 'org_demo_shanhai';
  const existing = db.prepare('SELECT id FROM organizations WHERE id = ?').get(orgId);
  if (existing) {
    console.log('[import-shanhai] 山海拾光文旅工作空间已存在，跳过重复导入:', orgId);
    return { organizationId: orgId, alreadyExists: true };
  }

  // 1. 创建虚构演示企业工作空间
  db.prepare(
    `INSERT INTO organizations (id, name, slug, industry_type, location, description, is_demo)
     VALUES (?, ?, ?, ?, ?, ?, 1)`
  ).run(
    orgId,
    '山海拾光文旅（虚构演示企业）',
    'shanhai-shiguang-demo',
    'scenic_spot',
    '待核实（虚构演示品牌）',
    '【虚构品牌演示】主营景区门票、联票与文创产品；面向18-35岁年轻人、情侣、亲子及周末短途出游人群，主阵地小红书。'
  );

  db.prepare(
    `INSERT INTO memberships (id, organization_id, user_id, display_name, role)
     VALUES ('mem_sh_1', ?, 'local-admin', '山海拾光运营主理人', 'owner'),
            ('mem_sh_2', ?, 'external-agent', '外部接管智能体（最小权限）', 'agent_readonly')`
  ).run(orgId, orgId);

  db.prepare(
    `INSERT INTO brand_profiles (id, organization_id, positioning, target_audiences_json, tone_keywords_json, visual_guidelines, forbidden_claims_json, verified_facts_note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    'brand_sh_1',
    orgId,
    '治愈、好拍、有文化感、适合周末短途的文旅体验与文创品牌',
    JSON.stringify(['18-35岁年轻人', '情侣', '亲子家庭', '周末短途出游人群']),
    JSON.stringify(['治愈', '好拍', '有文化感', '克制留白', '行前可行动']),
    '竖幅 3:4，暖米白纸感、低饱和雾绿与灰蓝、少量陶土色，自然漫射光；内部轮播统一标注「概念示意」，真实点位上线时替换为已授权实拍。',
    JSON.stringify(['虚构价格或库存', '虚构具体景区地址或开放时间', '未核实的退改承诺']),
    'V01~V08 均处于待核实状态，正式投放前需景区/票务/文创运营人工确认。'
  );

  // 初始化模型路由配置与适配器状态
  for (const [cap, model] of [
    ['text', process.env.AI_DEFAULT_TEXT_MODEL || 'gpt-4o-mini'],
    ['vision', 'gpt-4o-mini'],
    ['image', 'dall-e-3'],
    ['embedding', 'text-embedding-3-small'],
  ] as const) {
    db.prepare(
      `INSERT OR IGNORE INTO provider_configs (id, organization_id, capability, provider, model_name, base_url, allow_test_mode)
       VALUES (?, ?, ?, 'openai', ?, '', 1)`
    ).run(`pc_sh_${cap}`, orgId, cap, model);
  }

  for (const [id, name, type, status, note] of [
    ['src_sh_manual', '项目简报与人工录入台', 'manual', 'connected', '已录入 SRC01 与公开对标样本'],
    ['src_sh_xhs', '小红书开放平台适配器', 'xiaohongshu_adapter', 'not_connected', '未接通：当前仅支持公开聚合页/指定链接人工导入'],
    ['src_sh_dy', '抖音生活服务适配器', 'douyin_adapter', 'not_connected', '未接通'],
  ] as const) {
    db.prepare(
      `INSERT OR IGNORE INTO sources (id, organization_id, name, source_type, url, keywords_json, connection_status, status_note)
       VALUES (?, ?, ?, ?, '', '[]', ?, ?)`
    ).run(id, orgId, name, type, status, note);
  }

  // 2. 录入产品（严格标为 unverified 待核实）
  const insertProd = db.prepare(
    `INSERT INTO products (id, organization_id, name, category, summary, price_info, address, opening_hours, highlights_json, verification_status, is_demo)
     VALUES (?, ?, ?, ?, ?, '待核实（V04/V05）', '待核实（V03）', '待核实（V03）', ?, 'unverified', 1)`
  );
  insertProd.run('prod_sh_ticket', orgId, '景区门票（待核实SKU）', 'scenic_ticket', '周末半日慢游、亲子出游核心入园门票。', JSON.stringify(['半日慢游适配', '行前核对清单']));
  insertProd.run('prod_sh_combo', orgId, '景区联票（待核实SKU）', 'scenic_combo', '覆盖刚需点位与体验项目的组合联票方案。', JSON.stringify(['同一天同行人比总价', '预约与核销核对']));
  insertProd.run('prod_sh_merch', orgId, '山海拾光在地文创产品（待核实SKU）', 'cultural_merch', '适合自留或送礼的文化纪念小物（书签/纸品/礼盒方向）。', JSON.stringify(['纹样文化来源', '日常实用场景', '材质尺寸核对']));

  // 3. 录入六类企业知识库 (A~F)
  createKnowledgeDocument({
    organizationId: orgId,
    category: 'A_FACTS',
    title: '山海拾光文旅｜已知企业事实 (F01-F05) 与待核实清单 (V01-V08)',
    content: `【已知企业事实（来源 SRC01）】\n- F01: 山海拾光文旅是项目简报中的虚构文旅公司。\n- F02: 产品类别为景区门票、联票、文创产品。\n- F03: 客群包括 18–35 岁年轻人、情侣、亲子、周末出游人群。\n- F04: 调性为治愈、好拍、有文化感、适合周末短途。\n- F05: 目标平台为小红书，营销目标为提高收藏、咨询、下单转化。\n\n【待核实信息清单（严禁编造）】\n- V01 企业资料与基线、V02 指定对标案例、V03 景区与真实路线时间、V04 门票联票价格与退改规则、V05 文创 SKU 材质库存、V06 站内私信与商品卡链路、V07 亲子设施、V08 系统写回字段契约。`,
    sourceRef: 'SRC01 项目简报',
    verificationStatus: 'needs_review',
    isDemo: true,
  });

  createKnowledgeDocument({
    organizationId: orgId,
    category: 'B_PRODUCTS',
    title: '山海拾光文旅｜门票、联票与文创产品核对边界',
    content: `当前三类核心产品（景区门票、联票、文创产品）均未确认具体 SKU、当日价格、库存、预约核销与退改条款。\n创作文案时：门票与联票必须引导用户「收藏核对清单 / 核对包含项目与退改」，严禁写死具体票价；文创产品聚焦「纹样来源 + 使用场景 + 材质尺寸核对」，确认客服承接后再切换站内私信 CTA。`,
    sourceRef: 'SRC01 V04/V05',
    verificationStatus: 'unverified',
    isDemo: true,
  });

  createKnowledgeDocument({
    organizationId: orgId,
    category: 'C_BRAND',
    title: '山海拾光文旅｜品牌内容方向与 3:4 视觉规范',
    content: `品牌内容方向：把周末安排得松一点，把出门前要查的问题说清楚。用能截图的路线、能讲出来源的小物、能对照的购票清单，把好看变成可行动。\n画面方向：竖幅 3:4，暖米白纸感、低饱和雾绿与灰蓝，少量陶土色，自然漫射光，克制留白。内部轮播底部统一后加「概念示意」，真实景区或商品上线时替换为已授权实拍。`,
    sourceRef: '山海拾光 Demo 第四节',
    verificationStatus: 'verified',
    isDemo: true,
  });

  createKnowledgeDocument({
    organizationId: orgId,
    category: 'D_STRATEGIES',
    title: '山海拾光文旅｜三大可复用小红书策略卡 (S01-S03)',
    content: `S01 半日路线收藏卡：标题(时段+可带走清单) -> 三站示意 -> 三张单站说明 -> 出门前检查表（主指标：收藏率）。\nS02 文创细节到咨询卡：场景封面 -> 一种细节 -> 查来源 -> 按用途筛选 -> 比较实物 -> 一个具体问题（主指标：有效咨询率）。\nS03 门票与联票决策卡：选票问题 -> 定刚需点位 -> 逐项比较包含范围 -> 人群与时段 -> 预约退改 -> 购前核对（主指标：商品点击到支付转化率）。`,
    sourceRef: '山海拾光 Demo 第四节',
    verificationStatus: 'verified',
    isDemo: true,
  });

  createKnowledgeDocument({
    organizationId: orgId,
    category: 'E_EXPERIENCE',
    title: '山海拾光文旅｜首周基线指标定义与复盘口径 (M01-M03)',
    content: `发布后 24 小时记录首轮数据，满 7 天记录同口径结果：\n- M01 收藏率 = 笔记收藏数 / 阅读数\n- M02 有效咨询率 = 可归因有效咨询人数 / 阅读数（按用户去重）\n- M03 商品点击到支付转化率 = 可归因支付买家数 / 商品点击用户数\n分母为零或未取到时记 null 并标注原因，绝不反推或捏造。`,
    sourceRef: '山海拾光 Demo 第四节',
    verificationStatus: 'verified',
    isDemo: true,
  });

  createKnowledgeDocument({
    organizationId: orgId,
    category: 'F_SYSTEM_AGENT',
    title: '山海拾光文旅｜外部 Agent 接管与写回规范 (shanhaishiguang-xhs-20261126)',
    content: `记录标识：shanhaishiguang-xhs-20261126。外部 Agent 调用 MCP 或 REST API 操作本企业时，必须携带 X-Organization-Id: org_demo_shanhai。\n安全规则：不得将 V01-V08 待核实信息编造为已确认事实；生成图文后仅可保存草稿（pending_review），需人工审核后方可记录发布。`,
    sourceRef: '山海拾光 Demo 第七节',
    verificationStatus: 'verified',
    isDemo: true,
  });

  // 4. 导入公开对标观察 (B01, B02, B03) 到市场情报与案例分析中心
  const benchmarks = [
    {
      id: 'case_sh_b01',
      title: 'B01｜小红书官方大理与厦门旅行笔记聚合页观察',
      url: 'https://fe.xiaohongshu.com/ditto/vincent/a846d7fa85df40d3bcd9c7e8703a080b?fullscreen=true&naviHidden=yes',
      raw: '大理聚合页出现一日游、老城区 Citywalk 和本地人视角；厦门聚合页出现具体街道、地铁玩法、步行负担等出游决策线索。聚合页可看标题与选题，单篇收藏、阅读与投放口径未齐。',
      hook: '把人群、可用时段与一项限制放进封面或标题，读者更容易判断能否照着做',
      audience: '18-35岁周末短途出游人群',
      pain: '只有半天或第一次去，担心行程安排太满、步行负担不透明',
      structure: '时段承诺封面 → 三站路线概览 → 单站实操细节 → 出门前检查表',
      strategy: 'S01 半日路线收藏卡：用可截图的路线顺序提高回看与收藏率',
      score: 90,
      evidence: '小红书官方大理/厦门聚合页公开观察（2026-11-25 检索，单篇互动分母待补）',
    },
    {
      id: 'case_sh_b02',
      title: 'B02｜莫干山国际旅游度假区官方号公开案例观察',
      url: 'https://cdn.zdes.org.cn/upload/20210706/c5eb69a524514887aa4076c264d32179/DigitalTourismCase.pdf',
      raw: '浙江省数字经济学会《数字旅游最佳实践案例》第18、20页记载：案例截图出现公交交通攻略和周边民宿介绍，笔记曾提供订购入口，账号运营半年累计获赞与收藏超1.6万。单篇收藏率与订单贡献待核实。',
      hook: '先回答出行交通或选票决策问题，再自然承接商品入口',
      audience: '高意向周末出游与亲子家庭客群',
      pain: '拿不准交通接驳、票种差异与适用条件',
      structure: '选票/交通痛点 → 刚需点位对比 → 适用时段与退改规则 → 核实后商品入口',
      strategy: 'S03 门票与联票决策卡：先解决决策问题，再引导查看已核实商品信息',
      score: 88,
      evidence: '《数字旅游最佳实践案例》公开 PDF 第18、20页（累计互动非单篇口径）',
    },
    {
      id: 'case_sh_b03',
      title: 'B03｜长治古建集章活动公开报道观察',
      url: 'https://www.changzhi.gov.cn/ztzl/cjwmwz/tpxw_6120/202409/P020240911308604380686.pdf',
      raw: '长治市政府网站所载《上党晚报》2024年古建活动报道：用通关文牒和七处古建盖章串起路线，小红书是官方活动信息渠道之一。把抽象文化主题变成能观察或带走的小物细节。',
      hook: '从一个纹样、一处工艺出处切入，把抽象文化变成可带走的小物故事',
      audience: '情侣、喜欢文化感纪念品的年轻人',
      pain: '想买有纪念意义的文创，但担心好看却用不上、没有故事感',
      structure: '场景封面 → 纹样细节 → 查文化出处 → 按用途筛选 → 核对实物规格',
      strategy: 'S02 文创细节到咨询卡：以纹样来源+用途筛选激发私信咨询',
      score: 86,
      evidence: '长治市政府网站公开报道 PDF（历史线下活动机制，单篇数据待补）',
    },
  ];

  for (const b of benchmarks) {
    ingestManualIntelligence({
      organizationId: orgId,
      title: b.title,
      summary: b.raw.slice(0, 120),
      rawContent: b.raw,
      category: 'competitor',
      sourceName: '公开对标检索 (2026-11-25)',
      sourceUrl: b.url,
      isDemo: true,
    });

    createContentCase({
      organizationId: orgId,
      platform: 'xiaohongshu',
      title: b.title,
      sourceUrl: b.url,
      rawText: b.raw,
      metrics: { note: '公开文献/聚合页观察，单篇后台指标未采集' },
      metricsVerified: false,
      isDemo: true,
    });

    const latestCase = db
      .prepare('SELECT id FROM content_cases WHERE organization_id = ? AND title = ?')
      .get(orgId, b.title) as { id: string };

    const anaId = `ana_sh_${crypto.randomUUID().slice(0, 8)}`;
    db.prepare(
      `INSERT INTO case_analyses (
        id, organization_id, case_id, title_hook, target_audience, user_pain_points,
        content_structure, emotional_value, visual_style, product_selling_points,
        conversion_method, reusable_strategy, org_fit_score, org_fit_reason,
        evidence_source, credibility_level, data_origin
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'medium', 'demo')`
    ).run(
      anaId,
      orgId,
      latestCase.id,
      b.hook,
      b.audience,
      b.pain,
      b.structure,
      '治愈、松弛、可照着执行的确定感',
      '3:4 暖米白+雾绿+灰蓝克制排版',
      '行前实用清单 / 在地文化出处 / 透明票务对照',
      '收藏清单 / 站内私信咨询 / 验证后商品卡购买',
      b.strategy,
      b.score,
      '高度匹配山海拾光文旅「治愈、好拍、有文化感、周末短途」定位',
      b.evidence
    );

    saveStrategyCard({
      organizationId: orgId,
      caseAnalysisId: anaId,
      title: b.strategy.split('：')[0],
      targetPlatform: 'xiaohongshu',
      targetAudience: b.audience,
      hookPattern: b.hook,
      structureTemplate: b.structure,
      conversionCta: '收藏清单 / 确认客服承接后站内私信',
      applicableScenarios: '山海拾光文旅小红书首周测试',
    });
  }

  // 5. 写入三篇完整小红书图文草稿 (D01, D02, D03)
  const drafts = [
    {
      projId: 'proj_sh_d01',
      verId: 'ver_sh_d01',
      prodId: 'prod_sh_ticket',
      topic: 'D01｜周末半日慢游清单（P01 · 2026-11-26 20:00）',
      audience: '18-35岁年轻人、周末短途出游人群',
      goal: '提升收藏率 (M01)',
      titles: [
        '周末只有半天？这张慢游清单收好（首选）',
        '周末半日游｜留一站给喜欢的风景',
        '不赶路的周末｜半天就走这三步',
      ],
      selectedTitle: '周末只有半天？这张慢游清单收好',
      body: `周末只有半天，我会先挑一个最想去的地方，再给路上留一点空。想看风景可以，想拍几张照片也可以。把这份排法套到你自己的目的地就好。\n\n① 抵达先留缓冲。路上和进门的时间分开估，到了先确认入口、最晚入场和回程方式。带小朋友或长辈同行，可以事先标好一个休息点。\n\n② 把最好的一段留给主景。先看一会儿，再拍两张：一张放进路和人，一张留给当天喜欢的小细节。也可以先查一下拍摄规定，选能停留的位置。\n\n③ 散步是可选项。还有精神，就沿确认开放的路线再走一小段。天色变了，或者同行的人想早点回，就把回程时间留足。\n\n出门前最后看一眼：开放时间、当天票务、天气、返程。图 6 把这四件事放在了一起。\n\n先收藏图 6，下次周末空出半天，就用它排一趟自己的慢游。`,
      cover: '竖幅 3:4 概念示意插画：浅米色步道蜿蜒向雾绿色缓坡，上方三分之一留纯净米白放标题。',
      carousel: [
        { page: 1, title: '封面：周末半日慢游清单', visual: '浅米色步道与雾绿缓坡概念插画', copy: '一个主景，一段可选散步', imageUrl: '/demo-assets/shanhai-d01-cover.jpg' },
        { page: 2, title: '路线概览：半天怎么排？', visual: '三站横向图标底板', copy: '抵达缓冲 → 主景慢看 → 可选散步与返程' },
        { page: 3, title: '第一站：抵达留缓冲', visual: '布包、无字票套与铅笔静物', copy: '入口 / 最晚入场 / 回程方式' },
        { page: 4, title: '第二站：同一处拍两张', visual: '竖幅双联插画（环境+细节）', copy: '一张带环境｜一张拍细节' },
        { page: 5, title: '第三站：要不要再走一段？', visual: '树叶与车窗岔路极简插画', copy: '体力够、天气合适就走｜其余留给回程' },
        { page: 6, title: '可截图清单：出门前查这 4 件事', visual: '暖米白四行线描清单底板', copy: '开放时间｜当天票务｜天气｜返程（收藏这一页）' },
      ],
      cta: '先收藏图 6，下次周末空出半天，就用它排一趟自己的慢游。（正式点位上线前需核实 V03/V06）',
      tags: ['#周末去哪儿', '#周末短途游', '#半日游', '#出游清单', '#周末慢生活', '#山海拾光文旅'],
      warnings: ['引用了待核实项 V03（景区真实路线时间）与 V06（站内承接），当前版本为通用概念排法，上线真实景区前需核实替换。'],
    },
    {
      projId: 'proj_sh_d02',
      verId: 'ver_sh_d02',
      prodId: 'prod_sh_merch',
      topic: 'D02｜两个人挑一件有来处的文创（P03 · 2026-11-28 18:30）',
      audience: '情侣、18-35岁想买纪念品的年轻人',
      goal: '提升有效咨询率 (M02)',
      titles: [
        '情侣周末｜一起挑一件有来处的小物（首选）',
        '约会后想留点纪念？一起挑件文创',
        '买文创前，我会和对方一起问这三句',
      ],
      selectedTitle: '情侣周末｜一起挑一件有来处的小物',
      body: `两个人挑文创经常是这样：一个先被纹样吸引，另一个会问，带回家会放在哪里？我们会先各挑一件，再一起问这三句话。\n\n第一句：这个图案从哪里来？先看商品说明或问店员。如果能说出它从哪种器物、建筑或风景得到灵感，这趟出门就多了一件以后还能聊起的事。\n\n第二句：回家会怎么用？爱读书，可以看看书签类。喜欢把旅行记下来，可以看看纸品类。送人就先想想对方平时会不会用。这里举的是选物方向。\n\n第三句：实物拿在手里是什么样？看尺寸、材质和手感。送礼时还可以核对包装，出门前再查有没有货、怎么取。\n\n有时候最想带走的，就是一件能让两个人想起那天聊过什么的小东西。\n\n你会选自留还是送人？留言说说用途，比如阅读、手账或日常收纳。`,
      cover: '竖幅 3:4 俯视木桌插画：两位成年人的手各扶一张空白压纹纸样，左上暖米白留白。',
      carousel: [
        { page: 1, title: '封面：一起挑件有来处的文创', visual: '木桌双手选物概念插画', copy: '留住周末聊过的一件事', imageUrl: '/demo-assets/shanhai-d02-cover.jpg' },
        { page: 2, title: '打开情景：先各挑一件', visual: '左右对照静物插画', copy: '看着喜欢｜带回家会用' },
        { page: 3, title: '第一问：纹样从哪里来？', visual: '压纹纸样与空白说明卡', copy: '看说明，或问清设计灵感' },
        { page: 4, title: '第二问：回家会怎么用？', visual: '三格手账插画（书/本/礼盒）', copy: '阅读 / 记旅程 / 送人' },
        { page: 5, title: '第三问：实物怎么样？', visual: '中性纸片、无刻度尺与礼盒', copy: '尺寸、材质、包装、取货' },
        { page: 6, title: '互动收尾：自留还是送人？', visual: '双手合起米白小盒概念图', copy: '留言说说它会用在哪里（确认私信承接后可切换私信CTA）' },
      ],
      cta: '你会选自留还是送人？留言说说用途（确认客服承接 V05/V06 后切换为站内私信答复实物规格）。',
      tags: ['#周末约会', '#情侣周末', '#文创好物', '#旅行纪念品', '#选礼物灵感', '#山海拾光文旅'],
      warnings: ['引用了待核实项 V05（在售 SKU 材质尺寸库存）与 V06（站内私信承接），禁止在未核实前写死具体商品名称或价格。'],
    },
    {
      projId: 'proj_sh_d03',
      verId: 'ver_sh_d03',
      prodId: 'prod_sh_combo',
      topic: 'D03｜亲子景区门票和联票怎么选（P04 · 2026-11-29 20:00）',
      audience: '亲子家庭、准备下周末出游的家庭',
      goal: '商品点击到支付转化率 (M03) / Demo阶段先看收藏率',
      titles: [
        '带娃周末游｜景区门票和联票怎么选（首选）',
        '亲子出游买票前，先对照这张清单',
        '一家人买哪种票？先把这四项算清',
      ],
      selectedTitle: '带娃周末游｜景区门票和联票怎么选',
      body: `带娃去景区，我会先问家里人：这次最想去哪个点？再看看午休、走路和返程能留多少时间。买票这件事，可以照着下面四步来。\n\n① 列刚需点位。写下全家确定会去的地方，再把可去可不去的划到另一栏。安排半天时，先看能不能走完。\n\n② 用同一天、同一组同行人比总价。分别加上当天需要的门票和必付项目，再计算联票方案。接驳或体验有可能单独收费，逐项看商品说明。\n\n③ 看谁适用、什么时候能用。分别核对成人和儿童的购票条件、可选日期、入园时段、是否预约，以及各项目要怎么核销。\n\n④ 给变化留余地。准备付款前，看看未使用和部分核销时的退改条款，以及临时闭园或行程变化要从哪里查最新说明。\n\n把图 6 收藏起来。等日期和同行人定了，再按清单核对当日在售票种。`,
      cover: '竖幅 3:4 亲子出游主题插画：抽象无字票券与远处家长孩子小剪影，左上大块留白。',
      carousel: [
        { page: 1, title: '封面：带娃出游怎么选票？', visual: '无字票券与亲子剪影插画', copy: '景区门票和联票｜四步对照', imageUrl: '/demo-assets/shanhai-d03-cover.jpg' },
        { page: 2, title: '第一步：列刚需点位', visual: '两栏空白便签俯拍插画', copy: '一定去 / 有余量再去' },
        { page: 3, title: '第二步：按同一天同一组人算', visual: '两列细线对照矩阵（无数字）', copy: '门票方案 / 联票方案 / 加上必付项目' },
        { page: 4, title: '第三步：谁能用，什么时候用？', visual: '四格线描核对图标', copy: '适用条件 / 可选日期 / 预约 / 核销' },
        { page: 5, title: '第四步：看看变化怎么处理', visual: '三枚线描流程小图标', copy: '未使用 / 部分核销 / 临时闭园' },
        { page: 6, title: '购前收尾：付钱前再核对一遍', visual: '四行勾选清单底板', copy: '点位｜总价｜适用与核销｜退改（收藏这页）' },
      ],
      cta: '把图 6 收藏起来。等日期和同行人定了，再按清单核对当日在售票种（验证 V04/V06 商品卡后切换下单 CTA）。',
      tags: ['#亲子周末游', '#景区门票', '#联票怎么选', '#带娃出游', '#周末短途游', '#山海拾光文旅'],
      warnings: ['引用了待核实项 V03/V04/V06/V07，当前禁止出现具体价格数字或未验证的商品卡购买承诺。'],
    },
  ];

  for (const d of drafts) {
    db.prepare(
      `INSERT INTO content_projects (id, organization_id, product_id, topic, target_platform, target_audience, marketing_goal, content_style, visual_requirements, review_status, current_version_id, is_demo)
       VALUES (?, ?, ?, ?, 'xiaohongshu', ?, ?, '治愈、好拍、有文化感', '竖幅 3:4 暖米白+雾绿+灰蓝，概念示意', 'pending_review', ?, 1)`
    ).run(d.projId, orgId, d.prodId, d.topic, d.audience, d.goal, d.verId);

    db.prepare(
      `INSERT INTO content_versions (
        id, organization_id, project_id, version_number, titles_json, selected_title, body_copy,
        cover_design_note, carousel_plan_json, image_prompts_json, hashtags_json, conversion_cta,
        knowledge_citations_json, risk_check_json, data_origin
      ) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, '[]', ?, ?, ?, ?, 'demo')`
    ).run(
      d.verId,
      orgId,
      d.projId,
      JSON.stringify(d.titles),
      d.selectedTitle,
      d.body,
      d.cover,
      JSON.stringify(d.carousel),
      JSON.stringify(d.tags),
      d.cta,
      JSON.stringify([
        { documentId: 'kdoc_sh_facts', title: '山海拾光文旅｜已知企业事实 (F01-F05) 与待核实清单 (V01-V08)', category: 'A_FACTS', verificationStatus: 'needs_review' },
        { documentId: 'kdoc_sh_brand', title: '山海拾光文旅｜品牌内容方向与 3:4 视觉规范', category: 'C_BRAND', verificationStatus: 'verified' },
      ]),
      JSON.stringify({ passed: true, warnings: d.warnings })
    );
  }

  // 6. 注册概念示意封面与底图素材（均严格标注 isAiGenerated: true）
  const shanhaiAssets = [
    { title: 'D01 周末半日慢游封面（AI概念插画）', fileUrl: '/demo-assets/shanhai-d01-cover.jpg', mimeType: 'image/jpeg', sourceOrigin: 'AI生图智能体生成（概念示意，非实景）' },
    { title: 'D02 情侣挑文创选物封面（AI概念插画）', fileUrl: '/demo-assets/shanhai-d02-cover.jpg', mimeType: 'image/jpeg', sourceOrigin: 'AI生图智能体生成（概念示意，非实景）' },
    { title: 'D03 亲子门票联票对比封面（AI概念插画）', fileUrl: '/demo-assets/shanhai-d03-cover.jpg', mimeType: 'image/jpeg', sourceOrigin: 'AI生图智能体生成（概念示意，非实景）' },
    { title: 'D01 周末半日慢游清单底图（概念示意）', fileUrl: '/demo-assets/shanhai-cover-d01.svg', mimeType: 'image/svg+xml', sourceOrigin: '3:4 概念示意底图' },
    { title: 'D02 在地文创选物底图（概念示意）', fileUrl: '/demo-assets/shanhai-merch-d02.svg', mimeType: 'image/svg+xml', sourceOrigin: '3:4 概念示意底图' },
    { title: 'D03 景区门票联票清单底图（概念示意）', fileUrl: '/demo-assets/shanhai-ticket-d03.svg', mimeType: 'image/svg+xml', sourceOrigin: '3:4 概念示意底图' },
  ];
  for (const a of shanhaiAssets) {
    createAsset({
      organizationId: orgId,
      title: a.title,
      category: 'ai_concept',
      fileUrl: a.fileUrl,
      mimeType: a.mimeType,
      sourceOrigin: a.sourceOrigin,
      copyrightStatus: 'ai_generated_concept',
      isAiGenerated: true,
    });
  }

  writeAuditLog({
    organizationId: orgId,
    actorType: 'agent',
    actorId: 'antigravity-importer',
    action: 'workspace.import_brief',
    targetType: 'organization',
    targetId: orgId,
    detail: { sourceFile: 'TravelGrowthAI-山海拾光文旅-Demo.md', recordKey: 'shanhaishiguang-xhs-20261126' },
  });

  console.log('[import-shanhai] 导入完成！企业工作空间 ID:', orgId);
  return { organizationId: orgId, alreadyExists: false };
}

if (require.main === module) {
  importShanhaiShiguangDemo();
}
