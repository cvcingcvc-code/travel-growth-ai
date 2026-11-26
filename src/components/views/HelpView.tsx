'use client';

import React from 'react';
import { BookOpen, Bot, ExternalLink, ShieldCheck } from 'lucide-react';

export function HelpView() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#1d4ed8]">系统帮助中心与外部 Agent 接入指南</h1>
        <p className="text-xs text-[#475569] mt-0.5">
          为新用户与外部接管智能体提供最新的业务闭环说明、接口规范与安全边界。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="bg-[#ffffff] border border-[#e2e8f0] rounded p-5 space-y-3 text-xs leading-relaxed">
          <h2 className="text-sm font-semibold text-[#1d4ed8] flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-[#2563eb]" /> 核心业务闭环操作步骤
          </h2>
          <ol className="list-decimal list-inside space-y-1.5 text-[#475569]">
            <li>在顶部切换或创建独立企业工作空间（所有数据按 <code>organization_id</code> 严格隔离）。</li>
            <li>在「素材与产品」录入文旅产品，并在「企业知识库」补充 A~F 六类资料，确认价格与营业时间。</li>
            <li>在「市场情报中心」手动录入或导入公开 URL/RSS/CSV，在「爆款分析中心」拆解案例并存为策略卡片。</li>
            <li>在「AI 内容创作」选择产品与策略生成图文方案，编辑后保存草稿并提交人工审核。</li>
          </ol>
        </section>

        <section className="bg-[#ffffff] border border-[#e2e8f0] rounded p-5 space-y-3 text-xs leading-relaxed">
          <h2 className="text-sm font-semibold text-[#1d4ed8] flex items-center gap-1.5">
            <Bot className="w-4 h-4 text-[#2563eb]" /> 外部智能体与开放接口
          </h2>
          <p className="text-[#475569]">
            外部 Agent 可通过版本化 REST API 或 MCP 工具协议接管工作台（默认最小权限，禁止跳过人工审核直接发布）：
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <a
              href="/api/openapi.json"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded bg-[#f8fafc] border border-[#e2e8f0] text-[#1d4ed8] inline-flex items-center gap-1 hover:bg-[#f1f5f9]"
            >
              OpenAPI 3.1 规范 <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="/api/mcp"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded bg-[#f8fafc] border border-[#e2e8f0] text-[#1d4ed8] inline-flex items-center gap-1 hover:bg-[#f1f5f9]"
            >
              MCP 工具清单 (11项) <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </section>

        <section className="lg:col-span-2 bg-[#ffffff] border border-[#e2e8f0] rounded p-5 space-y-2 text-xs">
          <h2 className="text-sm font-semibold text-[#1d4ed8] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#2563eb]" /> 当前版本（P0）数据真实性与未接通能力声明
          </h2>
          <ul className="list-disc list-inside space-y-1 text-[#475569]">
            <li>小红书、抖音、微信公众号自动抓取与自动发布接口当前处于 <strong>未接通 (not_connected)</strong> 状态，不会伪造实时互动数据。</li>
            <li>未配置真实模型 API Key 时，系统明确进入 <strong>测试模式 (test_mode)</strong> 或提示未配置，不会冒充真实大模型输出。</li>
            <li>PDF / DOCX 知识解析接口已预留，第一阶段原生支持 Markdown、TXT、CSV 导入。</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
