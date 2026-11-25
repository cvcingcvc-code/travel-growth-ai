# REST API 与 OpenAPI 文档 — TravelGrowth AI

所有业务接口位于 `/api/v1/*`，OpenAPI 3.1 规范可通过 `GET /api/openapi.json` 获取。

## 通用请求头与隔离规则
- `X-Organization-Id`: 当前操作的目标企业 ID（必填，服务端校验归属与权限）。
- `Authorization`: 外部 Agent 调用时携带 `Bearer <AGENT_API_TOKEN>`（默认最小权限）。

## 核心端点一览
- `GET /api/v1/health` — 健康检查与数据库状态
- `GET/POST /api/v1/organizations` — 获取工作空间列表 / 创建新企业
- `GET/POST /api/v1/products` — 产品列表 / 新增文旅产品
- `GET/POST /api/v1/dashboard` — 今日工作台聚合数据
- `GET/POST /api/v1/intelligence` — 市场情报列表 / 手动录入、URL、RSS、CSV 导入
- `GET/POST /api/v1/cases` — 爆款案例列表 / 导入案例
- `POST /api/v1/cases/[id]/analyze` — 执行 11 维结构化爆款分析
- `GET/POST /api/v1/strategies` — 营销策略卡片列表 / 保存策略卡片
- `GET/POST/PUT/DELETE /api/v1/knowledge` — 6 大类知识库管理、导入与检索（`?q=`）
- `GET/POST /api/v1/creations` — 内容创作项目列表 / AI 生成选题、文案与图文方案
- `PUT /api/v1/creations/[id]` — 编辑内容、保存草稿新版本、人工审核状态流转
- `GET/POST /api/v1/assets` — 素材管理与版权标记
- `GET/POST /api/v1/models` — 模型配置、连通性测试与 `model_runs` 日志
- `POST /api/mcp` — MCP 工具调用端点（支持 11 个标准工具）
