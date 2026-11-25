# 系统架构设计 — TravelGrowth AI

## 1. 分层架构
```
+-------------------------------------------------------------+
|                   前端工作台 (Next.js App Router)            |
|  今日工作台 | 情报 | 爆款 | 知识库 | 创作 | 素材 | 模型 | 帮助 |
+-------------------------------------------------------------+
|            接口层: REST API (/api/v1/*) & MCP (/api/mcp)     |
|        OpenAPI 3.1 (/api/openapi.json) | 权限与租户校验       |
+-------------------------------------------------------------+
|                       业务服务层 (Services)                  |
|  Organization | Intelligence | Analysis | Knowledge | Create |
|  Asset | ModelConfig | Dashboard | Audit | Workflow         |
+-------------------------------------------------------------+
|              AI Provider 抽象层 (Text/Vision/Image/Embed)    |
|  OpenAI | Gemini | Claude | DeepSeek | Ollama | Test Mode   |
+-------------------------------------------------------------+
|          数据持久层 (Node SQLite + Tenant Guard + Uploads)   |
+-------------------------------------------------------------+
```

## 2. 解耦原则
- **Service 层无框架耦合**：所有业务逻辑位于 `src/lib/services/`，可被 REST API、Server Components、MCP 工具及自动化测试直接调用。
- **Provider 可插拔**：业务层仅依赖 `AIProviderRegistry` 接口，不直接 import 任何厂商 SDK。
- **数据状态显式化**：每条核心数据与返回结果均携带 `data_origin`（`real` / `demo` / `test_mode`）或 `connection_status`（`connected` / `unconfigured` / `not_connected`）。
