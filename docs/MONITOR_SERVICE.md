# 独立市场信息监控服务设计 (Independent Monitor Service)

## 设计原则
- **解耦运行**：市场监控任务契约定义于 `src/lib/contracts/monitor.contract.ts`，支持独立定时 Worker / Agent 在网页关闭后持续运行，并通过 `/api/v1/intelligence` 或 `collect_trends` 写入企业情报库。
- **监控要素**：支持监控关键词、平台适配器、频率（hourly/daily/weekly）、来源 URL、内容哈希去重、热度评分、企业匹配度与失败重试日志（`MonitorRunLog`）。
- **合规边界**：未获平台授权的适配器明确保持 `not_connected`，绝不伪造监控结果。
