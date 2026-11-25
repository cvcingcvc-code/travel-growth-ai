export function isDemoMode(): boolean {
  return (
    process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ||
    process.env.VERCEL === '1'
  );
}

export const SYSTEM_CAPABILITY_MATRIX = [
  {
    name: '多企业工作空间与数据隔离',
    status: 'verified',
    label: '已实现并验证',
    detail: '19 张核心表全链路绑定 organization_id，服务端与检索层双重隔离',
  },
  {
    name: '市场情报录入、URL/RSS/CSV 与去重',
    status: 'verified',
    label: '已实现并验证',
    detail: '支持手动、公开链接、RSS 与 CSV 导入，内容哈希自动去重',
  },
  {
    name: '11 维爆款分析与六类知识库混合检索',
    status: 'verified',
    label: '已实现并验证',
    detail: '支持关键词+向量检索、未核实事实[待核实]拦截与策略卡片沉淀',
  },
  {
    name: '在线无密钥 Demo 演示模式',
    status: 'demo',
    label: 'Demo 演示',
    detail: '内置 2 家演示企业，草稿支持浏览器本地存储与一键重置，不修改正式库',
  },
  {
    name: '本地模型接入 (Ollama / LM Studio / vLLM)',
    status: 'reserved',
    label: '接口已预留',
    detail: '已定义统一 Provider 契约、Base URL、超时与分任务模型路由',
  },
  {
    name: '独立知识库 / 市场监控 Worker / Agent 任务契约',
    status: 'reserved',
    label: '接口已预留',
    detail: '已预留 REST / OpenAPI 3.1 / MCP 11 项工具与独立 Worker 任务契约',
  },
  {
    name: '小红书 / 抖音 / 微信公众号自动采集与发布',
    status: 'not_connected',
    label: '尚未接通',
    detail: '无官方授权凭据，保持 not_connected 状态，绝不伪造实时互动数据',
  },
  {
    name: 'PDF / DOCX 文档解析',
    status: 'not_connected',
    label: '尚未接通',
    detail: '已预留解析接口，当前原生支持 Markdown / TXT / CSV 导入',
  },
] as const;
