import { NextResponse } from 'next/server';

export async function GET() {
  const spec = {
    openapi: '3.1.0',
    info: {
      title: 'TravelGrowth AI REST API',
      version: '0.1.0',
      description: '文旅内容营销智能工作台开放接口（支持多企业隔离与外部 Agent 接管）',
    },
    paths: {
      '/api/v1/health': { get: { summary: '健康检查', responses: { '200': { description: 'OK' } } } },
      '/api/v1/organizations': {
        get: { summary: '获取企业列表或单个企业详情', responses: { '200': { description: 'OK' } } },
        post: { summary: '创建企业工作空间', responses: { '201': { description: 'Created' } } },
      },
      '/api/v1/products': {
        get: { summary: '获取当前企业产品列表', responses: { '200': { description: 'OK' } } },
        post: { summary: '录入文旅产品', responses: { '201': { description: 'Created' } } },
      },
      '/api/v1/dashboard': {
        get: { summary: '获取今日工作台聚合数据', responses: { '200': { description: 'OK' } } },
      },
      '/api/v1/intelligence': {
        get: { summary: '获取市场情报与适配器状态', responses: { '200': { description: 'OK' } } },
        post: { summary: '导入市场情报（手动/URL/RSS/CSV）', responses: { '201': { description: 'Created' } } },
      },
      '/api/v1/cases': {
        get: { summary: '获取市场案例列表', responses: { '200': { description: 'OK' } } },
        post: { summary: '录入市场案例', responses: { '201': { description: 'Created' } } },
      },
      '/api/v1/cases/{id}/analyze': {
        post: { summary: '执行 11 维结构化爆款分析', responses: { '201': { description: 'Analyzed' } } },
      },
      '/api/v1/strategies': {
        get: { summary: '获取营销策略卡片', responses: { '200': { description: 'OK' } } },
        post: { summary: '保存营销策略卡片', responses: { '201': { description: 'Created' } } },
      },
      '/api/v1/knowledge': {
        get: { summary: '列出或检索六类企业知识库（?q=）', responses: { '200': { description: 'OK' } } },
        post: { summary: '新增或导入知识文档', responses: { '201': { description: 'Created' } } },
        put: { summary: '更新知识文档与版本', responses: { '200': { description: 'Updated' } } },
        delete: { summary: '删除知识文档', responses: { '200': { description: 'Deleted' } } },
      },
      '/api/v1/creations': {
        get: { summary: '获取内容创作项目列表', responses: { '200': { description: 'OK' } } },
        post: { summary: '生成选题或完整图文创作方案', responses: { '201': { description: 'Created' } } },
      },
      '/api/v1/creations/{id}': {
        put: { summary: '编辑保存草稿新版本或人工确认发布记录', responses: { '200': { description: 'Updated' } } },
      },
      '/api/v1/assets': {
        get: { summary: '获取企业素材列表', responses: { '200': { description: 'OK' } } },
        post: { summary: '登记企业素材与版权信息', responses: { '201': { description: 'Created' } } },
      },
      '/api/v1/models': {
        get: { summary: '获取模型配置状态与调用日志', responses: { '200': { description: 'OK' } } },
        post: { summary: '更新模型路由偏好或测试连通性', responses: { '200': { description: 'OK' } } },
      },
      '/api/mcp': {
        get: { summary: '发现 MCP 标准工具清单', responses: { '200': { description: 'OK' } } },
        post: { summary: '调用 MCP 工具（默认最小权限）', responses: { '200': { description: 'OK' } } },
      },
    },
  };
  return NextResponse.json(spec);
}
