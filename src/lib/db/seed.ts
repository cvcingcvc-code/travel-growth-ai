import crypto from 'node:crypto';
import { getDb } from './client';
import { tokenizeForSearch, computeDeterministicEmbedding } from '../utils/text';
import { importShanhaiShiguangDemo } from './import-shanhai';

export function seedDatabaseIfEmpty(force = false) {
  const db = getDb();
  const countRow = db.prepare('SELECT COUNT(*) as cnt FROM organizations').get() as { cnt: number };
  if (countRow.cnt > 0 && !force) {
    return { seeded: false, reason: 'already_initialized' };
  }

  const org1Id = 'org_demo_songjian';
  const org2Id = 'org_demo_qingcheng';

  const insertOrg = db.prepare(`
    INSERT OR IGNORE INTO organizations (id, name, slug, industry_type, location, description, is_demo)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `);

  insertOrg.run(
    org1Id,
    '松间隐庐精品民宿（演示企业）',
    'songjian-yinlu-demo',
    'homestay',
    '浙江省湖州市莫干山镇',
    '【演示数据】藏于莫干山竹海深处的东方美学度假民宿，主打围炉煮茶、森林徒步与亲子自然研学。'
  );

  insertOrg.run(
    org2Id,
    '云溪古镇文旅景区（演示企业）',
    'yunxi-ancient-town-demo',
    'scenic_spot',
    '四川省成都市近郊',
    '【演示数据】千年水乡古镇与非遗手作体验景区，主打夜游灯会、非遗集市与汉服旅拍。'
  );

  // Memberships
  const insertMember = db.prepare(`
    INSERT OR IGNORE INTO memberships (id, organization_id, user_id, display_name, role)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertMember.run('mem_1', org1Id, 'local-admin', '主理人（本地管理员）', 'owner');
  insertMember.run('mem_2', org1Id, 'external-agent', '外部智能体（最小权限）', 'agent_readonly');
  insertMember.run('mem_3', org2Id, 'local-admin', '景区运营总监', 'owner');

  // Brand profiles
  const insertBrand = db.prepare(`
    INSERT OR IGNORE INTO brand_profiles (id, organization_id, positioning, target_audiences_json, tone_keywords_json, visual_guidelines, forbidden_claims_json, verified_facts_note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertBrand.run(
    'brand_1',
    org1Id,
    '江浙沪 2 小时可达的山野东方美学避世民宿',
    JSON.stringify(['江浙沪25-38岁都市白领', '高净值亲子家庭', '周末轻奢度假情侣']),
    JSON.stringify(['松弛感', '克制雅致', '在地风物', '不刻意煽情']),
    '低饱和墨绿、原木暖白、清晨竹雾实景光影，避免高饱和滤镜与夸张大字海报',
    JSON.stringify(['全网最低价', '100%无蚊虫', '绝对私密无人区']),
    '价格、房态与接驳政策需以官方小程序实时核实为准。'
  );
  insertBrand.run(
    'brand_2',
    org2Id,
    '巴蜀文化沉浸式夜游与非遗手作活态古镇',
    JSON.stringify(['成渝周末短途游客', '汉服文化爱好者', '研学亲子团']),
    JSON.stringify(['烟火气', '文化厚度', '国风雅韵']),
    '青瓦白墙、灯笼暖光、非遗匠人特写，严禁将 AI 概念图冒充景区实景',
    JSON.stringify(['全国第一古镇', '免票无限畅玩']),
    '夜游演出时间受天气影响，需标注以景区当日公告为准。'
  );

  // Products
  const insertProduct = db.prepare(`
    INSERT OR IGNORE INTO products (id, organization_id, name, category, summary, price_info, address, opening_hours, highlights_json, verification_status, is_demo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);
  insertProduct.run(
    'prod_1',
    org1Id,
    '听竹私汤双卧合院（演示产品）',
    'homestay_room',
    '独立竹林庭院与山泉私汤泡池，适合家庭或好友周末包院度假。',
    '平日参考价 ¥1,880/晚起（演示数据，实际以房态日历为准）',
    '浙江省湖州市德清县莫干山镇仙潭村（演示地址）',
    '入住 14:00 后 / 退房 12:00 前',
    JSON.stringify(['独立山泉私汤', '270度竹海落地窗', '含双人山野早餐与围炉下午茶']),
    'verified'
  );
  insertProduct.run(
    'prod_2',
    org1Id,
    '莫干山秋季徒步+古法制茶一日营（演示产品）',
    'experience',
    '由在地向导带领穿越千年竹径，体验炒茶与山野冷餐。',
    '待核实（需联系管家确认团期报价）',
    '莫干山仙潭村集合（演示地址）',
    '每周六 09:30 - 16:00（需提前2天预约）',
    JSON.stringify(['在地向导带队', '非遗炒茶体验', '赠送山野手账']),
    'unverified'
  );
  insertProduct.run(
    'prod_3',
    org2Id,
    '云溪夜游船票+非遗油纸伞体验套票（演示产品）',
    'scenic_ticket',
    '乘摇橹船赏两岸花灯，并亲手绘制一把传统非遗油纸伞。',
    '¥168/人（演示数据）',
    '四川省成都市云溪古镇东门码头（演示地址）',
    '夜游 18:30 - 21:30',
    JSON.stringify(['画舫摇橹夜游', '非遗匠人手把手教学', '赠古镇手绘地图']),
    'verified'
  );

  // Sources (including explicit un-connected platform adapters)
  const insertSource = db.prepare(`
    INSERT OR IGNORE INTO sources (id, organization_id, name, source_type, url, keywords_json, connection_status, status_note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertSource.run('src_manual_1', org1Id, '人工情报录入台', 'manual', '', JSON.stringify(['莫干山民宿', '围炉煮茶', '江浙沪周末游']), 'connected', '已就绪');
  insertSource.run('src_rss_1', org1Id, '文旅行业公开 RSS 订阅（示例）', 'rss', 'https://example.com/travel-rss.xml', JSON.stringify(['乡村度假', '避暑/赏秋', '私汤']), 'connected', '支持合规公开 RSS/URL 解析');
  insertSource.run('src_xhs_1', org1Id, '小红书开放平台适配器', 'xiaohongshu_adapter', '', JSON.stringify(['莫干山', '江浙沪民宿']), 'not_connected', '未接通：需企业自有合规授权凭据，禁止无授权抓取');
  insertSource.run('src_dy_1', org1Id, '抖音生活服务数据适配器', 'douyin_adapter', '', JSON.stringify(['周边游', '私汤民宿']), 'not_connected', '未接通：需配置抖音开放平台授权');
  insertSource.run('src_wx_1', org1Id, '微信公众号文章适配器', 'wechat_adapter', '', JSON.stringify(['文旅营销']), 'not_connected', '未接通：支持手动粘贴 URL 或正文导入');

  // Intelligence Items
  const intelSamples = [
    {
      id: 'intel_1',
      orgId: org1Id,
      sourceId: 'src_manual_1',
      title: '【演示情报】江浙沪秋季“山野私汤+避世慢生活”搜索热度上升',
      summary: '随着气温转凉，25-35岁都市客群在周末短途游中更偏好“不用做攻略、一站式发呆放空”的私汤民宿。',
      raw: '【演示数据】多家公开旅游消费观察指出，2小时高铁/自驾圈内的山野私汤与在地茶饮体验成为秋季高频需求，用户对“隐蔽性”“实景图真实性”和“宠物/亲子友好度”格外敏感。',
      category: 'trend',
      keywords: ['山野私汤', '江浙沪周末游', '松弛感'],
      sourceName: '人工录入（演示）',
      url: '',
    },
    {
      id: 'intel_2',
      orgId: org1Id,
      sourceId: 'src_manual_1',
      title: '【演示情报】平台强化“真实实景与价格透明”内容规范',
      summary: '图文笔记若使用 AI 概念图未标注，或价格描述含糊引流，易触发限流或用户负面评论。',
      raw: '【演示数据】文旅类内容需严格区分实景拍摄与概念效果图，房价、套餐包含项目需与落地页一致。',
      category: 'platform_rule',
      keywords: ['实景标注', '合规规范', '价格透明'],
      sourceName: '人工录入（演示）',
      url: '',
    },
    {
      id: 'intel_3',
      orgId: org2Id,
      sourceId: null,
      title: '【演示情报】成渝古镇夜游“非遗手作+汉服旅拍”联名套餐受青睐',
      summary: '单纯门票销售转化偏低，结合体验型伴手礼的套票更容易形成二次传播。',
      raw: '【演示数据】游客更愿意为可带走的记忆付费，如油纸伞、扎染等非遗体验。',
      category: 'trend',
      keywords: ['古镇夜游', '非遗手作', '旅拍'],
      sourceName: '人工录入（演示）',
      url: '',
    },
  ];

  const insertIntel = db.prepare(`
    INSERT OR IGNORE INTO intelligence_items (id, organization_id, source_id, title, summary, raw_content, category, keywords_json, source_name, source_url, content_hash, is_demo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);
  for (const item of intelSamples) {
    const hash = crypto.createHash('sha256').update(`${item.orgId}:${item.title}`).digest('hex').slice(0, 16);
    insertIntel.run(
      item.id,
      item.orgId,
      item.sourceId,
      item.title,
      item.summary,
      item.raw,
      item.category,
      JSON.stringify(item.keywords),
      item.sourceName,
      item.url,
      hash
    );
  }

  // Content Cases & Case Analyses & Marketing Strategies
  db.prepare(`
    INSERT OR IGNORE INTO content_cases (id, organization_id, intelligence_item_id, platform, title, author_handle, source_url, raw_text, metrics_json, metrics_verified, is_demo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)
  `).run(
    'case_1',
    org1Id,
    'intel_1',
    'xiaohongshu',
    '【演示案例】逃离杭州1小时，我在莫干山竹海里泡了三天私汤',
    '@山野生活志（演示账号）',
    'https://example.com/demo-case-1',
    '周五下班直接开车进山，推开院门就是满眼墨绿竹海。没有赶景点的焦虑，白天在院子里围炉煮茶，晚上听着风声泡山泉私汤。第二天管家还带去后山采了秋笋。评论区很多人问具体房型和周末价格。',
    JSON.stringify({ note: '演示案例：未接入平台实时 API，无真实后台互动数据' })
  );

  db.prepare(`
    INSERT OR IGNORE INTO case_analyses (id, organization_id, case_id, title_hook, target_audience, user_pain_points, content_structure, emotional_value, visual_style, product_selling_points, conversion_method, reusable_strategy, org_fit_score, org_fit_reason, evidence_source, credibility_level, data_origin)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'demo')
  `).run(
    'ana_1',
    org1Id,
    'case_1',
    '“逃离+具体车程(1小时)+反差体验(竹海泡三天私汤)”制造即刻出发冲动',
    '杭州/上海 25-35岁高压职场人及周末短途情侣',
    '周末想休息但怕长途奔波、怕网红景点人挤人、不知住哪家靠谱',
    '下班出发切入 → 推门第一眼实景 → 昼夜双场景（煮茶+私汤） → 在地细节（采笋） → 评论区互动引导',
    '情绪松弛感、逃离日常的掌控感与山野治愈感',
    '自然光影实景图，墨绿竹海与热气腾腾茶汤形成冷暖对比',
    '1小时可达便利性 + 独立竹海私汤 + 管家在地体验',
    '评论区置顶房型亮点，引导私信或点击官方预约核实房态',
    '“短车程逃离 + 昼夜双情绪场景 + 真实细节锚点”三段式种草结构',
    92,
    '高度契合松间隐庐“江浙沪2小时山野私汤”定位，可直接复用至听竹私汤双卧合院。',
    '人工录入演示案例正文（无平台后台授权数据，互动指标未核实）',
    'medium'
  );

  db.prepare(`
    INSERT OR IGNORE INTO marketing_strategies (id, organization_id, case_analysis_id, title, target_platform, target_audience, hook_pattern, structure_template, conversion_cta, applicable_scenarios, status, is_demo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', 1)
  `).run(
    'strat_1',
    org1Id,
    'ana_1',
    '短途逃离+昼夜双场景私汤种草公式（演示策略）',
    'xiaohongshu',
    '江浙沪都市白领 / 周末情侣',
    '逃离[城市]+[车程]小时，在[核心意象]里虚度两天',
    '1.下班出发痛点切入 2.推门实景视觉冲击 3.白天慢体验+夜晚私汤反差 4.管家服务细节 5.明确核实引导',
    '评论区留言出行日期，获取官方实时房态与管家接驳指引',
    '秋冬私汤季、周末避世房型推广'
  );

  // Knowledge Documents (All 6 categories A~F for org1, plus 1 doc for org2 to test isolation)
  const docs = [
    {
      id: 'kdoc_a1',
      orgId: org1Id,
      cat: 'A_FACTS',
      title: '松间隐庐基本事实与交通指引（演示已核实）',
      content: '松间隐庐位于浙江省湖州市莫干山镇仙潭村。杭州自驾约1小时，上海自驾约2.5小时；高铁至德清站后预约接驳车约35分钟可达。共12间客房，含1座独立双卧合院。宠物政策：仅合院庭院支持小型犬（需提前报备清洁费，具体金额待核实）。',
      status: 'verified',
    },
    {
      id: 'kdoc_b1',
      orgId: org1Id,
      cat: 'B_PRODUCTS',
      title: '听竹私汤双卧合院产品手册（演示已核实）',
      content: '听竹私汤双卧合院面积160㎡，配备2张1.8m大床、独立竹林庭院与山泉水加热私汤泡池（每日一客一换水）。含4人份山野早餐及时令围炉下午茶。平日参考价 ¥1,880/晚起，节假日浮动价格以官方小程序实时日历为准。',
      status: 'verified',
    },
    {
      id: 'kdoc_c1',
      orgId: org1Id,
      cat: 'C_BRAND',
      title: '品牌调性与内容禁用词规范（演示）',
      content: '品牌调性：克制、自然、东方山居美学。禁用词：全网最低、绝对私密、100%无蚊虫、天花板级（易引发投诉与广告法风险）。所有配图优先使用实景拍摄，若使用AI概念图必须明确标注“创意概念图，非实景”。',
      status: 'verified',
    },
    {
      id: 'kdoc_d1',
      orgId: org1Id,
      cat: 'D_STRATEGIES',
      title: '江浙沪秋冬私汤内容爆款打法（演示）',
      content: '核心公式：1小时车程便利性 + 昼夜温差下的热气私汤视觉 + 具体季节风物（秋笋、桂花、红枫）。封面建议采用3:4竖图，留白处放不超过10字的钩子标题。',
      status: 'verified',
    },
    {
      id: 'kdoc_e1',
      orgId: org1Id,
      cat: 'E_EXPERIENCE',
      title: '历史运营复盘：实景细节比空泛文案更易转化（演示）',
      content: '过往复盘显示，展示“泡池放水温度细节”“早餐手工桂花糕”等具体生活切片，比单纯发外观建筑图咨询率更高。未核实的接驳费和周边餐厅营业时间切勿在正文中写死。',
      status: 'verified',
    },
    {
      id: 'kdoc_f1',
      orgId: org1Id,
      cat: 'F_SYSTEM_AGENT',
      title: 'TravelGrowth AI 系统与外部 Agent 操作规范',
      content: '外部 Agent 在生成文案前必须先调用 search_knowledge 检索 A/B/C 类已核实资料；遇到未核实的价格、时间、政策必须标注[待核实]；生成结果仅可保存为草稿(save_draft)，严禁跳过人工审核直接发布。',
      status: 'verified',
    },
    {
      id: 'kdoc_org2_secret',
      orgId: org2Id,
      cat: 'A_FACTS',
      title: '云溪古镇内部运营机密与票务政策（演示隔离数据）',
      content: '【仅限云溪古镇企业可见】云溪古镇东门码头夜游船队每日限量30班，非遗油纸伞合作工坊结算暗号为 YUNXI-2026。',
      status: 'verified',
    },
  ];

  const insertDoc = db.prepare(`
    INSERT OR IGNORE INTO knowledge_documents (id, organization_id, category, title, content, source_type, source_ref, verification_status, version, is_demo)
    VALUES (?, ?, ?, ?, ?, 'manual', '系统演示初始化', ?, 1, 1)
  `);
  const insertChunk = db.prepare(`
    INSERT OR IGNORE INTO knowledge_chunks (id, organization_id, document_id, chunk_index, content, tokens_json, embedding_json)
    VALUES (?, ?, ?, 0, ?, ?, ?)
  `);

  for (const d of docs) {
    insertDoc.run(d.id, d.orgId, d.cat, d.title, d.content, d.status);
    const fullText = `${d.title}\n${d.content}`;
    const tokens = tokenizeForSearch(fullText);
    const emb = computeDeterministicEmbedding(fullText);
    insertChunk.run(`chk_${d.id}`, d.orgId, d.id, fullText, JSON.stringify(tokens), JSON.stringify(emb));
  }

  // Assets
  const insertAsset = db.prepare(`
    INSERT OR IGNORE INTO assets (id, organization_id, title, category, file_url, mime_type, source_origin, copyright_status, is_ai_generated, is_demo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);
  insertAsset.run(
    'ast_1',
    org1Id,
    '听竹合院清晨竹海实景图（演示占位）',
    'real_scenic',
    '/demo-assets/bamboo-courtyard.svg',
    'image/svg+xml',
    '企业自有摄影团队实拍（演示占位）',
    'owned',
    0
  );
  insertAsset.run(
    'ast_2',
    org1Id,
    '围炉煮茶氛围概念图（AI 概念示意）',
    'ai_concept',
    '/demo-assets/tea-concept.svg',
    'image/svg+xml',
    'AI 概念草图（非真实景区照片）',
    'ai_generated_concept',
    1
  );

  // Content Project & Version
  db.prepare(`
    INSERT OR IGNORE INTO content_projects (id, organization_id, product_id, strategy_id, topic, target_platform, target_audience, marketing_goal, content_style, visual_requirements, review_status, current_version_id, is_demo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_review', 'ver_1', 1)
  `).run(
    'proj_1',
    org1Id,
    'prod_1',
    'strat_1',
    '杭州自驾1小时，躲进莫干山竹海里泡三天私汤（演示草稿）',
    'xiaohongshu',
    '江浙沪25-35岁都市白领及情侣',
    '周末合院预订引流',
    '松弛感自然叙事',
    '优先使用听竹合院实景图，墨绿与暖白主色调',
  );

  db.prepare(`
    INSERT OR IGNORE INTO content_versions (id, organization_id, project_id, version_number, titles_json, selected_title, body_copy, cover_design_note, carousel_plan_json, image_prompts_json, hashtags_json, conversion_cta, knowledge_citations_json, risk_check_json, data_origin)
    VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'demo')
  `).run(
    'ver_1',
    org1Id,
    'proj_1',
    JSON.stringify([
      '逃离杭州1小时！在莫干山竹海独院里泡三天山泉私汤',
      '周五下班直接进山：160㎡听竹合院的秋冬慢生活',
      '不想去景区人挤人？莫干山这座竹海私汤院子太好躺了',
    ]),
    '逃离杭州1小时！在莫干山竹海独院里泡三天山泉私汤',
    '周五傍晚从杭州出发，大约1小时车程就钻进了莫干山仙潭村的竹海深处。\n\n这次住进「听竹私汤双卧合院」，推开院门就是160㎡的独立竹林庭院。没有赶景点的闹钟，白天在院子里围炉煮茶，晚上听着竹叶沙沙声泡一池每日一换的山泉私汤。\n\n清晨醒来，管家已经备好了山野早餐。非常适合两家人或三五好友周末包院放空。\n\n📌 实用信息（来自企业已核实资料）：\n- 位置：莫干山镇仙潭村（德清高铁站可提前预约接驳）\n- 房型：双卧160㎡独院，含私汤泡池与4人早餐\n- 参考价格：平日 ¥1,880/晚起（周末及节假日请以官方日历实时核实为准）',
    '3:4 竖版实景图，取景清晨带薄雾的竹林庭院与冒热气的汤池一角，上方留白放标题“杭州1h · 竹海私汤独院”。',
    JSON.stringify([
      { page: 1, title: '封面：竹海独院实景', visual: '清晨竹海院门实景', copy: '逃离城市1小时，把周末还给山野' },
      { page: 2, title: '白天：庭院围炉煮茶', visual: '原木茶台与热茶特写', copy: '晒着冬日暖阳，慢煮一壶山泉白茶' },
      { page: 3, title: '夜晚：独立山泉私汤', visual: '暖光灯笼与私汤水汽', copy: '一客一换山泉私汤，洗去一周疲惫' },
      { page: 4, title: '空间：160㎡双卧合院细节', visual: '270度竹景落地窗卧室', copy: '两间独立大床房，家人好友互不打扰' },
      { page: 5, title: '攻略：交通与预约核实指引', visual: '素雅米白信息卡片', copy: '杭州1h直达，房态与接驳请以官方小程序为准' },
    ]),
    JSON.stringify([
      '【概念草图提示词-非实景】东方美学山野民宿庭院，清晨薄雾中的墨绿色竹林，原木围炉茶席，柔和自然光，低饱和色调，胶片质感（注：实际发布请优先使用企业实景照片）',
    ]),
    JSON.stringify(['#莫干山民宿', '#江浙沪周末游', '#山野私汤', '#杭州周边游', '#松间隐庐']),
    '评论区留言预计出行日期，或私信获取官方实时房态与管家接驳指引。',
    JSON.stringify([
      { documentId: 'kdoc_a1', title: '松间隐庐基本事实与交通指引（演示已核实）', category: 'A_FACTS', verificationStatus: 'verified' },
      { documentId: 'kdoc_b1', title: '听竹私汤双卧合院产品手册（演示已核实）', category: 'B_PRODUCTS', verificationStatus: 'verified' },
    ]),
    JSON.stringify({
      passed: true,
      warnings: ['价格标注了“平日参考价起”，已提醒以官方实时日历为准。'],
      unverifiedFacts: [],
    })
  );

  // Provider default config (unconfigured keys -> test_mode allowed)
  const insertProvider = db.prepare(`
    INSERT OR IGNORE INTO provider_configs (id, organization_id, capability, provider, model_name, base_url, allow_test_mode)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `);
  for (const orgId of [org1Id, org2Id]) {
    insertProvider.run(`pc_${orgId}_text`, orgId, 'text', process.env.AI_DEFAULT_TEXT_PROVIDER || 'openai', process.env.AI_DEFAULT_TEXT_MODEL || 'gpt-4o-mini', '');
    insertProvider.run(`pc_${orgId}_vision`, orgId, 'vision', 'openai', 'gpt-4o-mini', '');
    insertProvider.run(`pc_${orgId}_image`, orgId, 'image', 'openai', 'dall-e-3', '');
    insertProvider.run(`pc_${orgId}_emb`, orgId, 'embedding', 'openai', 'text-embedding-3-small', '');
  }

  // Workflow run & audit log
  db.prepare(`
    INSERT OR IGNORE INTO workflow_runs (id, organization_id, workflow_name, trigger_source, status, summary, finished_at)
    VALUES ('wf_seed_1', ?, '系统初始化与演示数据种子写入', 'seed', 'completed', '已初始化19张核心表与3个隔离演示企业工作空间（均明确标记为演示数据）', datetime('now'))
  `).run(org1Id);

  importShanhaiShiguangDemo();

  return { seeded: true };
}
