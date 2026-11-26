'use client';

import React from 'react';
import { ArrowRight, Bot, CheckCircle2, FileText, Layers, Radar, Send, Sparkles, Target } from 'lucide-react';
import type { NavTab } from '../AppShell';
import { SYSTEM_CAPABILITY_MATRIX } from '@/lib/demo/demo-mode';

interface DashboardData {
  organization: { id: string; name: string; is_demo: number };
  summary: {
    intelligenceCount: number;
    casesCount: number;
    strategiesCount: number;
    projectsCount: number;
    pendingReviewCount: number;
  };
  intelligenceItems: Array<{ id: string; title: string; category: string; source_name: string; collected_at: string; is_demo: number }>;
  projects: Array<{ id: string; topic: string; review_status: string; target_platform: string; updated_at: string; is_demo: number }>;
  knowledgeStats: Array<{ category: string; count: number; verified_count: number }>;
  providerStatuses: Array<{ capability: string; provider: string; modelName: string; status: string; statusNote: string }>;
}

export function TodayView({
  data,
  loading,
  onNavigate,
}: {
  data: DashboardData | null;
  loading: boolean;
  onNavigate: (tab: NavTab) => void;
}) {
  if (loading || !data) {
    return (
      <div className="p-8 text-center text-xs text-[#64748b] bg-white border border-[#e2e8f0] rounded-lg">
        正在加载企业营销工作台...
      </div>
    );
  }

  const textModel = data.providerStatuses.find((p) => p.capability === 'text');

  return (
    <div className="space-y-6">
      {/* 顶部任务聚焦头 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[#0f172a]">今日营销任务与成果总览</h1>
          <p className="text-xs text-[#64748b] mt-0.5">
            全链路闭环：企业入驻 → 知识库 → 专属 Agent → 市场情报 → 营销方案 → 内容生产 → 发布包 → 数据复盘
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onNavigate('agent')}
            className="px-3 py-1.5 rounded-md border border-[#e2e8f0] bg-white hover:bg-[#f8fafc] text-[#0f172a] text-xs font-medium inline-flex items-center gap-1.5"
          >
            <Bot className="w-3.5 h-3.5 text-[#1d4ed8]" /> 专属 Agent
          </button>
          <button
            onClick={() => onNavigate('campaigns')}
            className="px-3 py-1.5 rounded-md border border-[#e2e8f0] bg-white hover:bg-[#f8fafc] text-[#0f172a] text-xs font-medium inline-flex items-center gap-1.5"
          >
            <Target className="w-3.5 h-3.5 text-[#1d4ed8]" /> 营销方案
          </button>
          <button
            onClick={() => onNavigate('creation')}
            className="px-3.5 py-1.5 rounded-md bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-medium inline-flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" /> 发起内容生产
          </button>
        </div>
      </div>

      {/* 端到端业务闭环快捷通道 */}
      <div className="bg-white border border-[#e2e8f0] rounded-lg p-4">
        <div className="text-xs font-semibold text-[#0f172a] mb-3">核心业务任务链路（点击进入对应环节）</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-xs">
          {[
            { step: '01', label: '企业与知识库', tab: 'brand_kb' as NavTab, count: `${data.knowledgeStats.reduce((s, k) => s + k.count, 0)} 篇` },
            { step: '02', label: '产品与素材', tab: 'products' as NavTab, count: '档案管理' },
            { step: '03', label: '专属 Agent', tab: 'agent' as NavTab, count: '8 角色就绪' },
            { step: '04', label: '市场与爆款', tab: 'intelligence' as NavTab, count: `${data.summary.intelligenceCount} 情报` },
            { step: '05', label: '营销方案', tab: 'campaigns' as NavTab, count: '7/30天计划' },
            { step: '06', label: '内容与生图', tab: 'creation' as NavTab, count: `${data.summary.projectsCount} 稿件` },
            { step: '07', label: '发布与复盘', tab: 'publish' as NavTab, count: `${data.summary.pendingReviewCount} 待审` },
          ].map((item) => (
            <button
              key={item.step}
              onClick={() => onNavigate(item.tab)}
              className="p-2.5 rounded-md bg-[#f8fafc] hover:bg-[#eff6ff] border border-[#e2e8f0] hover:border-[#bfdbfe] text-left transition-colors"
            >
              <div className="text-[10px] font-semibold text-[#1d4ed8]">STEP {item.step}</div>
              <div className="font-medium text-[#0f172a] mt-0.5">{item.label}</div>
              <div className="text-[11px] text-[#64748b] mt-1">{item.count}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 两栏核心成果：待审核与最新内容成果 + 最新市场情报与系统状态 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <section className="lg:col-span-7 bg-white border border-[#e2e8f0] rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-2.5">
            <h2 className="text-sm font-semibold text-[#0f172a] flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#1d4ed8]" />
              近期内容成果与待审核稿件 ({data.projects.length})
            </h2>
            <button onClick={() => onNavigate('publish')} className="text-xs text-[#1d4ed8] hover:underline inline-flex items-center gap-1">
              前往发布中心 <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {data.projects.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#94a3b8]">暂无内容稿件，点击右上角「发起内容生产」开始创作。</div>
          ) : (
            <div className="space-y-2">
              {data.projects.map((p) => (
                <div
                  key={p.id}
                  onClick={() => onNavigate('publish')}
                  className="cursor-pointer p-3 rounded-md bg-[#f8fafc] hover:bg-[#eff6ff]/60 border border-[#e2e8f0] flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-[#0f172a] truncate">{p.topic}</div>
                    <div className="text-[11px] text-[#64748b] mt-0.5">平台：{p.target_platform} · 更新于 {p.updated_at}</div>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-medium ${p.review_status === 'published_recorded' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {p.review_status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-[#e2e8f0] rounded-lg p-4 space-y-2.5">
            <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-2">
              <h2 className="text-sm font-semibold text-[#0f172a] flex items-center gap-1.5">
                <Radar className="w-4 h-4 text-[#1d4ed8]" /> 最新市场情报与对标
              </h2>
              <button onClick={() => onNavigate('intelligence')} className="text-xs text-[#1d4ed8] hover:underline">查看全部</button>
            </div>
            {data.intelligenceItems.slice(0, 4).map((item) => (
              <div key={item.id} className="p-2.5 rounded bg-[#f8fafc] border border-[#e2e8f0] text-xs">
                <div className="font-medium text-[#0f172a] line-clamp-1">{item.title}</div>
                <div className="text-[11px] text-[#64748b] mt-0.5">{item.source_name}</div>
              </div>
            ))}
          </div>

          <div className="bg-white border border-[#e2e8f0] rounded-lg p-4 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#0f172a] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> 模型与合规状态
              </span>
              <button onClick={() => onNavigate('settings')} className="text-[#1d4ed8] hover:underline">系统设置</button>
            </div>
            <div className="p-2.5 rounded bg-[#f8fafc] border border-[#e2e8f0]">
              <div className="flex justify-between">
                <span className="font-medium">文本模型：{textModel?.provider} / {textModel?.modelName}</span>
                <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px]">
                  {textModel?.status === 'connected' ? '真实密钥' : '测试模式'}
                </span>
              </div>
              <div className="text-[11px] text-[#64748b] mt-1">{textModel?.statusNote}</div>
            </div>
            <button onClick={() => onNavigate('review')} className="w-full py-2 rounded-md bg-[#eff6ff] text-[#1d4ed8] font-medium inline-flex items-center justify-center gap-1">
              <Send className="w-3.5 h-3.5" /> 进入数据复盘与知识回流
            </button>
          </div>
        </section>
      </div>

      {/* 系统能力与接入状态矩阵 */}
      <section className="bg-white border border-[#e2e8f0] rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-2">
          <h2 className="text-sm font-semibold text-[#0f172a] flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-[#1d4ed8]" /> 系统能力与真实接入状态矩阵
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {SYSTEM_CAPABILITY_MATRIX.map((cap) => (
            <div key={cap.name} className="p-3 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-xs space-y-1">
              <div className="flex items-start justify-between gap-1.5">
                <span className="font-medium text-[#0f172a]">{cap.name}</span>
                <span
                  className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    cap.status === 'verified'
                      ? 'bg-emerald-50 text-emerald-700'
                      : cap.status === 'demo'
                      ? 'bg-amber-50 text-amber-700'
                      : cap.status === 'reserved'
                      ? 'bg-[#eff6ff] text-[#1d4ed8]'
                      : 'bg-red-50 text-red-700'
                  }`}
                >
                  {cap.label}
                </span>
              </div>
              <div className="text-[11px] text-[#64748b] leading-relaxed">{cap.detail}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
