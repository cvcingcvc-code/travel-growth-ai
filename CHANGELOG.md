# Changelog

## [0.1.0] - 2026-11-25 (P0/第一阶段)

### Added
- 初始化 TravelGrowth AI 项目架构（Next.js + TypeScript + Tailwind CSS + Node SQLite）。
- 建立 19 张核心数据库表与企业级 `organization_id` 数据隔离机制，提供可重复初始化与演示种子脚本。
- 实现统一 AI Provider 抽象层（支持 OpenAI、Gemini、Claude、DeepSeek、Ollama、OpenAI-compatible），无密钥时提供明确标记的测试模式，完整记录 `model_runs`。
- 实现第一阶段核心工作台与业务闭环：
  - 今日工作台（概览与快捷入口）
  - 市场情报中心（手动录入、URL/RSS/CSV 导入、去重、平台适配器状态）
  - 爆款分析中心（11 维结构化分析与策略卡片沉淀）
  - 企业知识库（6 大分类、文档导入、关键词+向量检索、待核实提醒）
  - AI 内容创作中心（选题、多标题、正文、多页图文方案、知识引用、风险检查、草稿版本）
  - 素材管理中心（企业实景/概念图/海报管理与版权标记）
  - 模型配置中心（Provider 配置、测试模式、调用日志）
  - 网站内置帮助中心
- 实现版本化 REST API (`/api/v1/*`)、OpenAPI 3.1 文档 (`/api/openapi.json`) 与 MCP Server 接入端点 (`/api/mcp`)。
- 完善 `docs/` 全套产品、架构、数据模型、安全、API 与智能体接入文档。
