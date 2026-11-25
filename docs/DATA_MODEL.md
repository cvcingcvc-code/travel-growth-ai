# 数据库设计 — TravelGrowth AI

系统基于 SQLite（`node:sqlite`）实现持久化，并保持标准 SQL DDL 结构以便后续平滑迁移至 PostgreSQL。

## 核心 19 张数据表

| 序号 | 表名 | 用途说明 | 企业隔离字段 |
|---|---|---|---|
| 1 | `organizations` | 企业工作空间 | `id` (主键) |
| 2 | `memberships` | 成员与角色权限 | `organization_id` |
| 3 | `products` | 文旅产品与服务（含核实状态） | `organization_id` |
| 4 | `brand_profiles` | 品牌调性、禁用词、视觉规范 | `organization_id` |
| 5 | `sources` | 情报来源与平台适配器配置 | `organization_id` |
| 6 | `intelligence_items` | 市场情报条目（含去重指纹） | `organization_id` |
| 7 | `content_cases` | 市场爆款案例原文与真实互动指标 | `organization_id` |
| 8 | `case_analyses` | 11 维结构化爆款分析结果 | `organization_id` |
| 9 | `knowledge_documents` | 6 大类企业知识文档（含版本与核实状态） | `organization_id` |
| 10 | `knowledge_chunks` | 知识切片与向量存储 | `organization_id` |
| 11 | `marketing_strategies` | 沉淀的可复用营销策略卡片 | `organization_id` |
| 12 | `assets` | 素材库（区分实景与 AI 概念图、版权状态） | `organization_id` |
| 13 | `content_projects` | 内容创作项目（选题、产品、平台、审核状态） | `organization_id` |
| 14 | `content_versions` | 文案、多页图文方案、引用与风险检查版本 | `organization_id` |
| 15 | `publications` | 内容发布记录（人工确认后记录） | `organization_id` |
| 16 | `performance_metrics` | 流量与转化复盘指标 | `organization_id` |
| 17 | `model_runs` | AI 模型调用日志（模型、任务、耗时、Token、状态） | `organization_id` |
| 18 | `workflow_runs` | 工作流与后台任务执行记录 | `organization_id` |
| 19 | `audit_logs` | 高风险操作与权限审计日志 | `organization_id` |

外键约束均启用 `PRAGMA foreign_keys = ON`，服务层所有查询强制注入 `WHERE organization_id = ?`。
