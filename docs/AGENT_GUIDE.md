# 外部 Agent 与 MCP 接入指南 — TravelGrowth AI

TravelGrowth AI 原生支持其他智能体通过标准 REST API 或 MCP 端点接管文旅内容营销流程。

## 1. 认证与权限
- 请求 `/api/mcp` 需在 Header 中携带 `Authorization: Bearer <AGENT_API_TOKEN>` 与 `X-Organization-Id: <org_id>`。服务端需配置 `AGENT_ORGANIZATION_ID`。Token 绑定该企业，`external-agent` 成员必须已加入企业。写入需要编辑权限。
- 外部 Agent 默认采用**最小权限**，不可直接执行内容对外发布或删除核心企业知识。

## 2. 支持的 MCP 工具（11 项）
通过 `POST /api/mcp` 发送 `{ "tool": "<name>", "organizationId": "...", "input": { ... } }`：
1. `get_company_profile` — 获取企业基本信息、品牌规范与产品列表
2. `search_knowledge` — 检索企业六大类知识库（返回引用来源与核实状态）
3. `collect_trends` — 获取或导入市场情报条目
4. `analyze_content` — 对指定市场案例执行 11 维爆款分析
5. `generate_topics` — 基于企业知识与热点生成营销选题
6. `create_campaign` — 创建内容创作项目
7. `generate_copy` — 生成多标题、完整文案与风险检查
8. `generate_visual_plan` — 生成封面说明、多页图文方案与生图提示词
9. `save_draft` — 保存内容新版本草稿
10. `analyze_performance` — 汇总发布与流量表现复盘
11. `get_workflow_guide` — 获取系统最新操作指南与规范

## 3. 发现接口能力
- `GET /api/mcp` 返回所有工具的 JSON Schema 定义。
- `GET /api/openapi.json` 返回完整 OpenAPI 3.1 规范。
