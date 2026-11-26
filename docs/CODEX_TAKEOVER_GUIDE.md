# Codex / 外部智能体接管 TravelGrowth AI 2.0 完整操作指令

本文档供 **Codex、Claude Code、Antigravity 或其他外部智能体** 直接接管并操作 TravelGrowth AI 2.0 企业营销工作台。

---

## 一、认证方式与最小权限规则

1. **环境变量配置（服务端 `.env.local` 或云端环境变量）**：
   - `AGENT_API_TOKEN=<高强度随机密钥>`
   - `AGENT_ORGANIZATION_ID=<授权目标企业 ID，例如 org_demo_spruce 或 org_demo_shanhai>`
2. **数据库成员角色**：
   - `external-agent` 在目标企业 `memberships` 表中默认为 `agent_readonly`（仅读）。
   - 如需允许写入情报、分析、营销方案与保存草稿，管理员需将其角色授予 `agent_editor`。
3. **强制请求头**：
   ```http
   Authorization: Bearer <AGENT_API_TOKEN>
   X-Organization-Id: <target_organization_id>
   Content-Type: application/json
   ```
4. **协议诚实声明**：
   - `/api/mcp` 当前为**自定义 HTTP JSON 工具接口**（非标准 JSON-RPC 2.0 MCP Server），外部 Agent 请直接按标准 HTTP `POST` 调用。
   - 严禁跨企业读取、严禁跳过人工审核自动发布、严禁编造未核实价格/营业时间、严禁将 AI 概念图标记为真实景区照片。

---

## 二、核心 REST / HTTP Tool 接口清单

| 业务环节 | 接口地址 | 方法 | 用途 |
|---|---|---|---|
| 发现工具清单 | `/api/mcp` | `GET` | 查看全部 11 项工具与权限声明 |
| 开放规范 | `/api/openapi.json` | `GET` | 获取 OpenAPI 3.1 文档 |
| 6 步企业入驻 | `/api/v1/onboarding` | `POST` | 新建企业、知识库、产品与专属 Agent |
| 专属 Agent 状态与编排 | `/api/v1/agent-profile` | `GET / POST / PUT` | 获取配置、运行总控编排、查看真实步骤日志 |
| 企业知识库检索与写入 | `/api/v1/knowledge` | `GET / POST / PUT` | 混合检索（`?q=`）与 6 类文档管理 |
| 市场情报与同行分析 | `/api/v1/intelligence`, `/api/v1/cases`, `/api/v1/cases/:id/analyze` | `GET / POST` | 导入公开案例并执行 11 维拆解 |
| 自动营销方案 | `/api/v1/campaigns` | `GET / POST / PUT` | 生成 7天/30天方案、版本更新与审批 |
| AI 内容生产与草稿 | `/api/v1/creations`, `/api/v1/creations/:id` | `GET / POST / PUT` | 生成多平台文案与分镜、保存草稿、标记人工发布 |
| 真实生图与外部图挂载 | `/api/v1/images/generate` | `POST` | 调用真实生图 API 或挂载外部生成图至分镜与素材库 |
| 图文发布包导出 | `/api/v1/publish-package/:projectId` | `GET` | 下载标准 ZIP 发布包（`copy.txt` + `metadata.json` + 配图） |
| 社媒账号与复盘回流 | `/api/v1/review` | `GET / POST` | 登记账号、录入标明来源指标、生成复盘洞察并回流知识库 |

---

## 三、可直接复制给 Codex 的接管指令（Prompt）

```text
你现在作为外部营销智能体接管 TravelGrowth AI 2.0（服务地址：http://localhost:3000，目标企业 ID：org_demo_spruce）。
所有请求必须携带 Header：
  Authorization: Bearer <AGENT_API_TOKEN>
  X-Organization-Id: org_demo_spruce

请严格按以下 7 步顺序执行，不得编造企业未核实信息，不得自动发布到外部社媒：
1. 调用 POST /api/mcp (tool: "get_company_profile") 获取企业背景、品牌规范与产品核实状态。
2. 调用 POST /api/mcp (tool: "search_knowledge", input: { query: "核心卖点 交通 价格 禁区" }) 读取已核实事实与待核实边界。
3. 调用 GET /api/v1/cases 检查已有同行爆款案例；如有新公开案例链接，通过 POST /api/v1/cases 导入并调用 POST /api/v1/cases/{id}/analyze 拆解。
4. 调用 POST /api/v1/campaigns 生成结合产品与知识库的 7天/30天营销方案。
5. 调用 POST /api/mcp (tool: "create_campaign") 生成小红书/抖音/公众号多平台草稿，并用你自己的推理能力润色后调用 POST /api/mcp (tool: "save_draft") 保存为 pending_review 状态。
6. 若已配置图片模型密钥，调用 POST /api/v1/images/generate 生成配图并挂载；若未配置，导出生图提示词或通过 action="attach_external" 挂载外部生成图（强制标注 isAiGenerated: true）。
7. 提示人类运营前往「发布中心」人工审核、下载 ZIP 发布包并手动发布；发布后在「数据复盘」录入真实数据快照并审核回流知识库。
```
