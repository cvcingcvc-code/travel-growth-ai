# TravelGrowth AI — 文旅内容营销智能工作台

TravelGrowth AI 是一套面向景区、民宿、旅游企业及文化传播机构的专业内容营销智能工作台。它不是简单的聊天机器人或单次文案生成器，而是围绕文旅行业真实业务闭环构建的企业级 SaaS 系统：

**市场信息采集 → 热点与爆款分析 → 企业知识库检索 → 营销选题 → 文案及图文创作 → 人工审核 → 内容发布记录 → 流量数据复盘 → 运营经验沉淀 → 持续优化**

## 核心特性

1. **多企业工作空间与严格数据隔离**：所有核心实体均绑定 `organization_id`，数据库层与服务端双重校验企业身份，支持切换企业快速复用。
2. **明确区分数据状态**：清晰标识 **真实数据**、**演示数据（Demo）** 与 **未接通能力**，绝不伪造采集结果、互动数据或模型输出。
3. **企业知识库（6 大分类）**：支持企业基本事实、产品服务、品牌客群、市场案例策略、历史经验、系统/Agent 操作规范，支持关键词 + 向量混合检索与引用溯源，严禁编造价格/营业时间等未核实事实。
4. **可插拔 AI Provider 抽象层**：统一接口支持 Text / Vision / Image / Embedding 四类能力，预留 OpenAI、Gemini、Claude、DeepSeek、Ollama 及 OpenAI-compatible 接口；无有效密钥时明确显示未配置状态与测试模式，并记录每次 `model_runs`。
5. **开放 API 与智能体兼容**：提供版本化 REST API（`/api/v1/*`）、OpenAPI 3.1 规范（`/api/openapi.json`）及 MCP 工具协议端点（`/api/mcp`），支持其他智能体按最小权限安全接管。
6. **人工审核兜底**：默认不自动发布内容，高风险操作需人工确认并写入 `audit_logs`。

## 快速启动

### 1. 环境准备
- Node.js >= 22.5（内置 `node:sqlite`，推荐 v24+）
- npm >= 10 或 pnpm >= 9

### 2. 安装依赖与初始化数据库
```bash
npm install
cp .env.example .env.local
npm run db:init
```
`npm run db:init` 会执行数据库建表迁移（19 张核心表）并写入可重复执行的演示种子数据（明确标记为 `is_demo = 1`）。

### 3. 启动开发服务器
```bash
npm run dev
```
访问 `http://localhost:3000`。

### 4. 运行自动化测试与生产构建
```bash
npm test
npm run build
```

## 文档导航

- [产品需求文档 (PRD)](./docs/PRD.md)
- [系统架构设计](./docs/ARCHITECTURE.md)
- [数据库设计 (19 张核心表)](./docs/DATA_MODEL.md)
- [REST API 与 OpenAPI 文档](./docs/API.md)
- [核心业务工作流](./docs/WORKFLOWS.md)
- [用户操作指南](./docs/USER_GUIDE.md)
- [外部 Agent 与 MCP 接入指南](./docs/AGENT_GUIDE.md)
- [安全与企业隔离规范](./docs/SECURITY.md)
- [部署指南](./docs/DEPLOYMENT.md)
- [开发路线图](./docs/ROADMAP.md)
- [当前状态与未完成事项 (STATUS)](./docs/STATUS.md)
- [智能体开发规范 (AGENTS.md)](./AGENTS.md)
