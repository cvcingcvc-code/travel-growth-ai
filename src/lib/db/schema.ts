export const SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

-- 1. 企业工作空间
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  industry_type TEXT NOT NULL DEFAULT 'scenic_spot', -- scenic_spot | homestay | travel_agency | cultural_org
  location TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. 成员与权限
CREATE TABLE IF NOT EXISTS memberships (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'editor', -- owner | admin | editor | viewer | agent_readonly
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(organization_id, user_id)
);

-- 3. 文旅产品与服务
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'homestay_room',
  summary TEXT NOT NULL DEFAULT '',
  price_info TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  opening_hours TEXT NOT NULL DEFAULT '',
  highlights_json TEXT NOT NULL DEFAULT '[]',
  verification_status TEXT NOT NULL DEFAULT 'unverified', -- verified | unverified
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 4. 品牌及目标客群规范
CREATE TABLE IF NOT EXISTS brand_profiles (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  positioning TEXT NOT NULL DEFAULT '',
  target_audiences_json TEXT NOT NULL DEFAULT '[]',
  tone_keywords_json TEXT NOT NULL DEFAULT '[]',
  visual_guidelines TEXT NOT NULL DEFAULT '',
  forbidden_claims_json TEXT NOT NULL DEFAULT '[]',
  verified_facts_note TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 5. 数据来源与适配器配置
CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL, -- manual | url | rss | csv | xiaohongshu_adapter | douyin_adapter | wechat_adapter
  url TEXT NOT NULL DEFAULT '',
  keywords_json TEXT NOT NULL DEFAULT '[]',
  connection_status TEXT NOT NULL DEFAULT 'connected', -- connected | not_connected | error
  status_note TEXT NOT NULL DEFAULT '',
  last_synced_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 6. 市场情报条目
CREATE TABLE IF NOT EXISTS intelligence_items (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_id TEXT REFERENCES sources(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  raw_content TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'trend', -- trend | policy | competitor | festival | platform_rule
  keywords_json TEXT NOT NULL DEFAULT '[]',
  source_name TEXT NOT NULL DEFAULT '手动录入',
  source_url TEXT NOT NULL DEFAULT '',
  content_hash TEXT NOT NULL,
  is_demo INTEGER NOT NULL DEFAULT 0,
  collected_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(organization_id, content_hash)
);

-- 7. 市场爆款案例
CREATE TABLE IF NOT EXISTS content_cases (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  intelligence_item_id TEXT REFERENCES intelligence_items(id) ON DELETE SET NULL,
  platform TEXT NOT NULL DEFAULT 'xiaohongshu',
  title TEXT NOT NULL,
  author_handle TEXT NOT NULL DEFAULT '',
  source_url TEXT NOT NULL DEFAULT '',
  raw_text TEXT NOT NULL DEFAULT '',
  metrics_json TEXT NOT NULL DEFAULT '{}', -- 仅存真实可获取指标，无数据则为 {}
  metrics_verified INTEGER NOT NULL DEFAULT 0,
  is_demo INTEGER NOT NULL DEFAULT 0,
  collected_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 8. 爆款结构化分析结果
CREATE TABLE IF NOT EXISTS case_analyses (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  case_id TEXT NOT NULL REFERENCES content_cases(id) ON DELETE CASCADE,
  title_hook TEXT NOT NULL DEFAULT '',
  target_audience TEXT NOT NULL DEFAULT '',
  user_pain_points TEXT NOT NULL DEFAULT '',
  content_structure TEXT NOT NULL DEFAULT '',
  emotional_value TEXT NOT NULL DEFAULT '',
  visual_style TEXT NOT NULL DEFAULT '',
  product_selling_points TEXT NOT NULL DEFAULT '',
  conversion_method TEXT NOT NULL DEFAULT '',
  reusable_strategy TEXT NOT NULL DEFAULT '',
  org_fit_score INTEGER NOT NULL DEFAULT 0,
  org_fit_reason TEXT NOT NULL DEFAULT '',
  evidence_source TEXT NOT NULL DEFAULT '',
  credibility_level TEXT NOT NULL DEFAULT 'medium', -- high | medium | low
  data_origin TEXT NOT NULL DEFAULT 'real', -- real | demo | test_mode
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 9. 企业知识文档（A~F 六大分类）
CREATE TABLE IF NOT EXISTS knowledge_documents (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- A_FACTS | B_PRODUCTS | C_BRAND | D_STRATEGIES | E_EXPERIENCE | F_SYSTEM_AGENT
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'manual', -- manual | markdown | txt | csv | pdf_reserved | docx_reserved
  source_ref TEXT NOT NULL DEFAULT '',
  verification_status TEXT NOT NULL DEFAULT 'unverified', -- verified | unverified | needs_review
  version INTEGER NOT NULL DEFAULT 1,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 10. 知识切片与向量
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  content TEXT NOT NULL,
  tokens_json TEXT NOT NULL DEFAULT '[]',
  embedding_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 11. 沉淀的营销策略卡片
CREATE TABLE IF NOT EXISTS marketing_strategies (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  case_analysis_id TEXT REFERENCES case_analyses(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  target_platform TEXT NOT NULL DEFAULT 'xiaohongshu',
  target_audience TEXT NOT NULL DEFAULT '',
  hook_pattern TEXT NOT NULL DEFAULT '',
  structure_template TEXT NOT NULL DEFAULT '',
  conversion_cta TEXT NOT NULL DEFAULT '',
  applicable_scenarios TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'confirmed', -- confirmed | draft | archived
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 12. 素材管理中心
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'real_scenic', -- real_scenic | brand_material | product_photo | poster | document | ai_concept
  file_url TEXT NOT NULL DEFAULT '',
  mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
  source_origin TEXT NOT NULL DEFAULT '',
  copyright_status TEXT NOT NULL DEFAULT 'owned', -- owned | licensed | pending_verification | ai_generated_concept
  is_ai_generated INTEGER NOT NULL DEFAULT 0,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 13. 内容创作项目
CREATE TABLE IF NOT EXISTS content_projects (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  strategy_id TEXT REFERENCES marketing_strategies(id) ON DELETE SET NULL,
  topic TEXT NOT NULL,
  target_platform TEXT NOT NULL DEFAULT 'xiaohongshu',
  target_audience TEXT NOT NULL DEFAULT '',
  marketing_goal TEXT NOT NULL DEFAULT '种草引流',
  content_style TEXT NOT NULL DEFAULT '松弛感自然叙事',
  visual_requirements TEXT NOT NULL DEFAULT '',
  review_status TEXT NOT NULL DEFAULT 'draft', -- draft | pending_review | approved | rejected | published_recorded
  current_version_id TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 14. 内容版本与图文方案
CREATE TABLE IF NOT EXISTS content_versions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES content_projects(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  titles_json TEXT NOT NULL DEFAULT '[]',
  selected_title TEXT NOT NULL DEFAULT '',
  body_copy TEXT NOT NULL DEFAULT '',
  cover_design_note TEXT NOT NULL DEFAULT '',
  carousel_plan_json TEXT NOT NULL DEFAULT '[]',
  image_prompts_json TEXT NOT NULL DEFAULT '[]',
  hashtags_json TEXT NOT NULL DEFAULT '[]',
  conversion_cta TEXT NOT NULL DEFAULT '',
  knowledge_citations_json TEXT NOT NULL DEFAULT '[]',
  risk_check_json TEXT NOT NULL DEFAULT '{}',
  data_origin TEXT NOT NULL DEFAULT 'real', -- real | demo | test_mode
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 15. 内容发布记录（人工确认后记录，禁止自动发布）
CREATE TABLE IF NOT EXISTS publications (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES content_projects(id) ON DELETE CASCADE,
  version_id TEXT NOT NULL REFERENCES content_versions(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  published_url TEXT NOT NULL DEFAULT '',
  published_by TEXT NOT NULL DEFAULT 'human_operator',
  human_confirmed INTEGER NOT NULL DEFAULT 1,
  published_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 16. 流量数据复盘
CREATE TABLE IF NOT EXISTS performance_metrics (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  publication_id TEXT NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
  views INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  collects INTEGER NOT NULL DEFAULT 0,
  comments INTEGER NOT NULL DEFAULT 0,
  inquiries INTEGER NOT NULL DEFAULT 0,
  bookings INTEGER NOT NULL DEFAULT 0,
  takeaway_note TEXT NOT NULL DEFAULT '',
  recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 17. AI 模型调用记录
CREATE TABLE IF NOT EXISTS model_runs (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  capability TEXT NOT NULL, -- text | vision | image | embedding
  provider TEXT NOT NULL,
  model_name TEXT NOT NULL,
  task_type TEXT NOT NULL,
  status TEXT NOT NULL, -- success | test_mode | error | unconfigured
  duration_ms INTEGER NOT NULL DEFAULT 0,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  error_message TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 18. 工作流与系统任务执行记录
CREATE TABLE IF NOT EXISTS workflow_runs (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workflow_name TEXT NOT NULL,
  trigger_source TEXT NOT NULL DEFAULT 'ui', -- ui | api | mcp | seed
  status TEXT NOT NULL DEFAULT 'completed', -- running | completed | failed
  summary TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at TEXT
);

-- 19. 审计日志
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_type TEXT NOT NULL DEFAULT 'human', -- human | agent | system
  actor_id TEXT NOT NULL DEFAULT 'local-admin',
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL DEFAULT '',
  detail_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 模型配置表（存储非密钥的模型路由偏好，密钥仅来自环境变量或本地内存/安全存储）
CREATE TABLE IF NOT EXISTS provider_configs (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  capability TEXT NOT NULL, -- text | vision | image | embedding
  provider TEXT NOT NULL, -- openai | gemini | claude | deepseek | ollama | openai_compatible
  model_name TEXT NOT NULL,
  base_url TEXT NOT NULL DEFAULT '',
  allow_test_mode INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(organization_id, capability)
);

CREATE INDEX IF NOT EXISTS idx_products_org ON products(organization_id);
CREATE INDEX IF NOT EXISTS idx_intelligence_org ON intelligence_items(organization_id, collected_at DESC);
CREATE INDEX IF NOT EXISTS idx_cases_org ON content_cases(organization_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_org ON knowledge_documents(organization_id, category);
CREATE INDEX IF NOT EXISTS idx_chunks_org ON knowledge_chunks(organization_id, document_id);
CREATE INDEX IF NOT EXISTS idx_projects_org ON content_projects(organization_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_model_runs_org ON model_runs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_logs(organization_id, created_at DESC);
`;
