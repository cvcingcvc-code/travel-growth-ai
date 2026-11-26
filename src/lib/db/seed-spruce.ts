import { getDb } from './client';
import { createKnowledgeDocument } from '../services/knowledge.service';
import { ingestManualIntelligence } from '../services/intelligence.service';
import { createContentCase, saveStrategyCard } from '../services/analysis.service';
import { createAsset } from '../services/asset.service';
import { ensureOrganizationAgent, runOrchestratorDiagnostic } from '../services/agent-orchestrator.service';
import { createSocialAccount, recordPerformanceMetric, generateDataReviewInsight, syncInsightToKnowledgeBase } from '../services/review.service';
import { recordHumanPublication } from '../services/creation.service';

export function seedSpruceValleyDemo() {
  const db = getDb();
  const orgId = 'org_demo_spruce';
  if (db.prepare('SELECT id FROM organizations WHERE id = ?').get(orgId)) {
    return { organizationId: orgId, alreadyExists: true };
  }

  // 1. 创建企业工作空间与品牌规范
  db.prepare(
    `INSERT INTO organizations (id, name, slug, industry_type, location, description, is_demo)
     VALUES (?, ?, ?, 'homestay', '浙江省杭州市临安区天目山麓（演示地址）', '【2.0 全链路演示企业】藏于云杉溪谷的自然轻奢木屋营地，主打临溪木屋住宿、亲子自然手作与溪畔手冲咖啡体验。', 1)`
  ).run(orgId, '云杉溪谷自然营地（2.0演示）', 'spruce-valley-demo');

  db.prepare(
    `INSERT INTO memberships (id, organization_id, user_id, display_name, role)
     VALUES ('mem_sp_1', ?, 'local-admin', '营地主理人', 'owner'),
            ('mem_sp_2', ?, 'external-agent', 'Codex 外部智能体', 'agent_editor')`
  ).run(orgId, orgId);

  db.prepare(
    `INSERT INTO brand_profiles (id, organization_id, positioning, target_audiences_json, tone_keywords_json, visual_guidelines, forbidden_claims_json, verified_facts_note)
     VALUES ('brand_sp_1', ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    orgId,
    '杭州 1.2 小时直达的森林溪谷木屋与亲子自然美学营地',
    JSON.stringify(['杭州/上海 28-40岁亲子家庭', '户外美学与手冲咖啡爱好者', '周末逃离城市的年轻情侣']),
    JSON.stringify(['自然松弛', '真实细节', '不浮夸', '亲子友好']),
    '3:4 竖版自然光影，木质、云杉绿与暖光灯笼色调；AI 概念图严格标注非真实实景',
    JSON.stringify(['100%无虫蛇', '全网最低价', '绝对恒温不断电']),
    '木屋平日参考价已核实，周末节假日浮价与宠物清洁费需以官方小程序当日公告为准。'
  );

  for (const [cap, model] of [
    ['text', process.env.AI_DEFAULT_TEXT_MODEL || 'gpt-4o-mini'],
    ['vision', 'gpt-4o-mini'],
    ['image', 'dall-e-3'],
    ['embedding', 'text-embedding-3-small'],
  ] as const) {
    db.prepare(
      `INSERT OR IGNORE INTO provider_configs (id, organization_id, capability, provider, model_name, base_url, allow_test_mode)
       VALUES (?, ?, ?, 'openai', ?, '', 1)`
    ).run(`pc_sp_${cap}`, orgId, cap, model);
  }

  // 2. 产品档案（3个核心产品）
  const insProd = db.prepare(
    `INSERT INTO products (id, organization_id, name, category, summary, price_info, address, opening_hours, highlights_json, verification_status, is_demo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
  );
  insProd.run(
    'prod_sp_cabin',
    orgId,
    '临溪云杉木屋住宿（含双人早餐与咖啡券）',
    'homestay_room',
    '独立悬挑木露台直面山涧溪流，配备地暖、观星天窗与户外暖光灯笼。',
    '平日参考价 ¥1,480/晚起（演示已核实）',
    '杭州临安天目山麓云杉溪谷 1 号区',
    '入住 14:00 后 / 退房 12:00 前',
    JSON.stringify(['独立临溪木露台', '含山野双人早餐', '赠2杯溪畔手冲咖啡']),
    'verified'
  );
  insProd.run(
    'prod_sp_craft',
    orgId,
    '亲子松果与植物拓印自然手作营（半日）',
    'experience',
    '由自然导师带领拾取松果与秋叶，完成植物敲拓印帆布包与木质风铃。',
    '¥268 / 一大一小（演示已核实）',
    '云杉溪谷林下木作工坊',
    '每周六/日 10:00 - 12:00',
    JSON.stringify(['专业自然导师带队', '成品可带走', '林荫平地推车友好']),
    'verified'
  );
  insProd.run(
    'prod_sp_coffee',
    orgId,
    '溪畔秋日手冲咖啡慢享套票',
    'experience',
    '在溪水边树桩吧台现磨手冲云南高海拔豆，配手工桂花司康。',
    '待核实（季节限定豆单价格以现场为准）',
    '云杉溪谷东岸溪畔咖啡角',
    '每日 09:30 - 17:00',
    JSON.stringify(['手冲云南单品豆', '临溪树桩拍照位', '无需住宿也可单独预约']),
    'unverified'
  );

  // 3. 六类知识库
  createKnowledgeDocument({
    organizationId: orgId,
    category: 'A_FACTS',
    title: '云杉溪谷自然营地｜交通、停车与入住基本事实',
    content: '杭州西站自驾约1.2小时可达，营地入口设免费充电桩停车场。全营地共10栋独立临溪木屋，林下步道平缓支持婴儿推车通行。雨天自然手作自动移至室内玻璃木屋进行。',
    sourceRef: '企业入驻核实资料',
    verificationStatus: 'verified',
    isDemo: true,
  });
  createKnowledgeDocument({
    organizationId: orgId,
    category: 'B_PRODUCTS',
    title: '云杉溪谷｜木屋、亲子手作与溪畔咖啡产品手册',
    content: '临溪云杉木屋平日¥1,480/晚起含早与咖啡券；亲子自然手作营¥268/一大一小（周六日10:00-12:00）；溪畔手冲咖啡套票价格待核实，不可在文案中写死。',
    sourceRef: '产品部核实清单',
    verificationStatus: 'verified',
    isDemo: true,
  });
  createKnowledgeDocument({
    organizationId: orgId,
    category: 'C_BRAND',
    title: '云杉溪谷｜品牌调性与宣传红线',
    content: '调性：自然松弛、细节真实、克制留白。禁止承诺“100%无蚊虫”“全网最低价”；所有 AI 概念宣传图必须标注“创意概念图，非实景拍摄”。',
    sourceRef: '品牌部规范',
    verificationStatus: 'verified',
    isDemo: true,
  });

  // 4. 3 张真实 AI 生成的高质量宣传图入库
  const imgs = [
    { title: '临溪云杉木屋日落概念宣传图（AI生成）', url: '/demo-assets/spruce-cabin.jpg' },
    { title: '亲子自然植物拓印手作营概念图（AI生成）', url: '/demo-assets/spruce-craft.jpg' },
    { title: '溪畔秋日手冲咖啡特写概念图（AI生成）', url: '/demo-assets/spruce-coffee.jpg' },
  ];
  for (const img of imgs) {
    createAsset({
      organizationId: orgId,
      title: img.title,
      category: 'ai_concept',
      fileUrl: img.url,
      mimeType: 'image/jpeg',
      sourceOrigin: 'Antigravity AI 生图引擎真实生成（创意概念图）',
      copyrightStatus: 'ai_generated_concept',
      isAiGenerated: true,
    });
  }

  // 5. 同行爆款情报与 11 维分析
  ingestManualIntelligence({
    organizationId: orgId,
    title: '江浙沪森林露营/木屋“不住宿也能玩的半日体验”咨询量走高',
    summary: '很多带娃家庭先通过“半日手作/溪畔咖啡”低门槛体验，再转化为过夜木屋复购。',
    rawContent: '公开文旅观察显示，单晚千元以上的木屋直接冷启动转化门槛较高，通过“半日亲子手作+溪畔手冲”组合内容做首单种草，评论区询问周末房态的比例显著提升。',
    category: 'trend',
    sourceName: '行业观察人工整理',
    isDemo: true,
  });
  createContentCase({
    organizationId: orgId,
    platform: 'xiaohongshu',
    title: '杭州1小时！把娃放进森林里做植物拓印，大人在溪边喝手冲',
    sourceUrl: 'https://example.com/spruce-benchmark-1',
    rawText: '不用长途奔波，周六上午10点带娃在云杉树下捡松果做植物拓印，孩子专注了两小时，大人在旁边溪水边喝一杯热气腾腾的手冲咖啡，下午直接住进临溪木屋。',
    metrics: { note: '人工整理公开参考案例，未接入平台后台实时数据' },
    metricsVerified: false,
    isDemo: true,
  });
  saveStrategyCard({
    organizationId: orgId,
    title: '低门槛半日体验引流 → 临溪木屋过夜转化策略',
    targetPlatform: 'xiaohongshu',
    targetAudience: '杭州/上海亲子家庭与周末情侣',
    hookPattern: '杭州[车程]小时！把娃放进[自然体验]，大人在[治愈场景]放空',
    structureTemplate: '车程痛点切入 → 孩子专注体验细节 → 大人松弛场景 → 实用价格与雨天备选清单',
    conversionCta: '评论区留言出行周末，获取官方实时房态与手作营名额核实',
  });

  // 6. 自动创建专属 Agent 并执行初始 4 步结构化诊断（种子阶段不触发外部付费 LLM）
  ensureOrganizationAgent(orgId);
  void runOrchestratorDiagnostic(orgId, '结合云杉溪谷木屋、亲子手作与溪畔咖啡打造首周小红书引流方案', { skipLlmForSeed: true });

  // 7. 已审批的 7天/30天完整营销方案
  db.prepare(
    `INSERT INTO marketing_campaigns (
      id, organization_id, product_id, version_number, title, marketing_goal,
      target_audience_needs, differentiated_selling_points, topic_pool_json,
      platform_strategy_json, plan_7d_json, plan_30d_json, visual_direction,
      video_direction, conversion_guide, required_assets_and_unverified_json,
      approval_status, data_origin
    ) VALUES (?, ?, 'prod_sp_cabin', 2, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', 'demo')`
  ).run(
    'camp_sp_1',
    orgId,
    '云杉溪谷｜“半日自然体验 + 临溪木屋”双层转化营销方案',
    '提升小红书收藏率与周末房态/手作营有效咨询率',
    '杭州亲子家庭周末不想人挤人，希望孩子有高质量自然活动、大人能真正放松，且车程控制在1.5小时内。',
    '临溪悬挑木屋（¥1,480/晚起含早与咖啡）+ 周末亲子植物拓印手作（¥268/一大一小）+ 推车友好与雨天室内备选。',
    JSON.stringify([
      '杭州1.2h直达：推开窗就是云杉溪流的临溪木屋',
      '周六上午把娃交给自然导师：松果与植物拓印半日营',
      '不用住宿也能去：在秋天溪水边喝一杯热气手冲咖啡',
    ]),
    JSON.stringify({ 小红书: '3:4 高质感自然光影图文+实用行前清单', 抖音: '15秒溪水声白噪音+木屋日落空镜' }),
    JSON.stringify([
      { day: 'Day 1', topic: '临溪云杉木屋日落氛围与交通清单', platform: '小红书', goal: '收藏与房态咨询' },
      { day: 'Day 3', topic: '亲子松果植物拓印半日营实录', platform: '小红书', goal: '手作营报名咨询' },
      { day: 'Day 5', topic: '溪畔秋日手冲咖啡慢享攻略', platform: '小红书', goal: '低门槛到访引流' },
    ]),
    JSON.stringify([
      { week: '第1周', focus: '三大产品线首轮内容基线测试', deliverable: '发布3篇关联产品图文并记录M01/M02' },
      { week: '第2-4周', focus: '放大高咨询选题并沉淀复盘记忆', deliverable: '迭代封面与私信话术，经验回流知识库' },
    ]),
    '3:4 竖版自然光影实拍优先；概念图统一标注「创意概念图，非实景」。',
    '突出溪流环境音、倒水热气与手作专注细节，不加喧闹BGM。',
    '收藏行前清单，评论区留言周末日期获取官方实时房态与手作营余位。',
    JSON.stringify(['溪畔手冲咖啡套票季节限定价格待核实', '周末节假日木屋浮动价以官方小程序为准'])
  );

  // 8. 3 篇完整小红书图文内容（分别挂载 3 张真实 AI 高质量宣传图）
  const posts = [
    {
      projId: 'proj_sp_1',
      verId: 'ver_sp_1',
      prodId: 'prod_sp_cabin',
      topic: '杭州自驾1.2h｜住进推窗见溪的临溪云杉木屋',
      title: '杭州1.2h逃离计划｜在云杉溪谷木屋听着水声看日落',
      body: `周五下班从杭州西站出发，大约1.2小时就能开进天目山麓的云杉溪谷。\n\n这次住的「临溪云杉木屋」最打动人的，是那块直接悬挑在山涧溪流上的木露台。傍晚亮起暖光灯笼，听着溪水声吹风，整周的工作焦虑一下子就松下来了。\n\n📌 已核实实用信息（来自企业知识库）：\n- 交通停车：杭州西站自驾约1.2h，营地入口免费充电桩停车\n- 房型包含：独立临溪露台、地暖、双人山野早餐 + 2杯溪畔手冲咖啡\n- 平日参考价：¥1,480/晚起（周末及节假日以官方小程序实时房态为准）\n\n注：封面为 AI 概念宣传示意，正式出行前可咨询管家查看实景房态。`,
      img: '/demo-assets/spruce-cabin.jpg',
      tags: ['#杭州周边游', '#临安民宿', '#森林木屋', '#周末逃离计划', '#云杉溪谷'],
    },
    {
      projId: 'proj_sp_2',
      verId: 'ver_sp_2',
      prodId: 'prod_sp_craft',
      topic: '带娃周末不费妈｜林下松果与植物拓印半日自然营',
      title: '杭州亲子周末｜把娃放进云杉林做植物拓印，大人终于能歇口气',
      body: `周末带娃出门最怕大人累到崩溃、孩子玩十分钟就喊无聊。云杉溪谷每周六日上午10点的「亲子自然手作营」，刚好把节奏排得很舒服。\n\n自然导师会先带小朋友在平缓的林下步道捡松果和落叶（婴儿推车完全好推），再回到树荫木桌前亲手敲拓植物帆布包和串木质风铃，成品直接带回家。\n\n📌 已核实报名信息：\n- 时间：每周六/日 10:00 - 12:00（雨天自动移至室内玻璃木屋，不用担心白跑）\n- 费用：¥268 / 一大一小（含全部材料与导师指导）`,
      img: '/demo-assets/spruce-craft.jpg',
      tags: ['#杭州亲子游', '#自然教育', '#植物拓印', '#带娃周末去哪儿', '#云杉溪谷'],
    },
    {
      projId: 'proj_sp_3',
      verId: 'ver_sp_3',
      prodId: 'prod_sp_coffee',
      topic: '不用住宿也能来｜在秋日云杉溪畔喝一杯热气手冲咖啡',
      title: '秋天最治愈的半天｜在杭州山涧树桩旁喝一杯手冲咖啡',
      body: `如果周末只有半天时间、不打算过夜，也可以单独预约来云杉溪谷东岸的溪畔咖啡角发呆。\n\n清晨薄雾还没散时，在溪水边的雪松树桩吧台看热水注入手冲滤杯，配一块刚烤好的桂花司康，旁边就是潺潺溪流和落满秋叶的山林。\n\n📌 行前核实提示：\n- 开放时间：每日 09:30 - 17:00（无需住宿可单独预约）\n- 价格说明：[待核实] 季节限定手冲豆单价格以现场/官方预约页实时公示为准。`,
      img: '/demo-assets/spruce-coffee.jpg',
      tags: ['#山野咖啡', '#手冲咖啡', '#杭州秋日去处', '#周末慢生活', '#云杉溪谷'],
    },
  ];

  for (const p of posts) {
    db.prepare(
      `INSERT INTO content_projects (id, organization_id, product_id, topic, target_platform, target_audience, marketing_goal, content_style, visual_requirements, review_status, current_version_id, is_demo)
       VALUES (?, ?, ?, ?, 'xiaohongshu', '杭州/上海亲子家庭与周末短途客群', '收藏与有效咨询转化', '自然松弛、真实细节', '3:4 自然光影宣传图', 'approved', ?, 1)`
    ).run(p.projId, orgId, p.prodId, p.topic, p.verId);

    db.prepare(
      `INSERT INTO content_versions (
        id, organization_id, project_id, version_number, titles_json, selected_title, body_copy,
        cover_design_note, carousel_plan_json, image_prompts_json, hashtags_json, conversion_cta,
        knowledge_citations_json, risk_check_json, data_origin
      ) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, '[]', ?, ?, ?, ?, 'demo')`
    ).run(
      p.verId,
      orgId,
      p.projId,
      JSON.stringify([p.title]),
      p.title,
      p.body,
      '3:4 竖版自然光影封面（已挂载 AI 概念宣传图）',
      JSON.stringify([
        { page: 1, title: '封面主视觉', visual: '3:4 高质感自然光影宣传图', copy: p.title, imageUrl: p.img },
        { page: 2, title: '核心体验细节', visual: '营地细节与场景切片', copy: p.topic },
        { page: 3, title: '交通与价格核实清单', visual: '简洁浅色行前检查表', copy: '杭州西站1.2h直达，雨天有室内备选' },
      ]),
      JSON.stringify(p.tags),
      '评论区留言出行周末，获取官方实时房态与活动余位核实指引。',
      JSON.stringify([
        { documentId: 'kdoc_sp_facts', title: '云杉溪谷自然营地｜交通、停车与入住基本事实', category: 'A_FACTS', verificationStatus: 'verified' },
        { documentId: 'kdoc_sp_prod', title: '云杉溪谷｜木屋、亲子手作与溪畔咖啡产品手册', category: 'B_PRODUCTS', verificationStatus: 'verified' },
      ]),
      JSON.stringify({ passed: true, warnings: ['已标明 AI 概念宣传图非实景，未核实豆单价格已标注[待核实]。'] })
    );
  }

  // 9. 社媒账号 + 人工发布记录 + 标明来源数据快照 + 复盘洞察与知识库回流
  createSocialAccount({
    organizationId: orgId,
    platform: 'xiaohongshu',
    accountName: '云杉溪谷自然营地官方号',
    accountHandle: '@spruce_valley_demo',
    followersCount: 3280,
  });

  const pub1 = recordHumanPublication({
    organizationId: orgId,
    projectId: 'proj_sp_1',
    versionId: 'ver_sp_1',
    platform: 'xiaohongshu',
    publishedUrl: 'https://example.com/demo-post/spruce-cabin',
    humanConfirmed: true,
  }) as { id: string };

  const pub2 = recordHumanPublication({
    organizationId: orgId,
    projectId: 'proj_sp_2',
    versionId: 'ver_sp_2',
    platform: 'xiaohongshu',
    publishedUrl: 'https://example.com/demo-post/spruce-craft',
    humanConfirmed: true,
  }) as { id: string };

  recordPerformanceMetric({
    organizationId: orgId,
    publicationId: pub1.id,
    views: 3420,
    likes: 218,
    collects: 412,
    comments: 37,
    inquiries: 24,
    bookings: 5,
    dataSourceLabel: '演示复盘样本（模拟创作者后台导出）',
    takeawayNote: '临溪日落木屋封面点击与收藏率较高，评论区高频询问周末房态与宠物政策',
  });

  recordPerformanceMetric({
    organizationId: orgId,
    publicationId: pub2.id,
    views: 2890,
    likes: 175,
    collects: 368,
    comments: 42,
    inquiries: 31,
    bookings: 9,
    dataSourceLabel: '演示复盘样本（模拟创作者后台导出）',
    takeawayNote: '¥268 亲子半日手作营门槛低，有效咨询转化率最高',
  });

  const insight = generateDataReviewInsight(orgId) as { id: string };
  syncInsightToKnowledgeBase(orgId, insight.id);

  return { organizationId: orgId, alreadyExists: false };
}
