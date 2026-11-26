'use client';

import React from 'react';
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Compass,
  FileText,
  Layers,
  Radar,
  Send,
  Sparkles,
  Target,
} from 'lucide-react';
import { useWorkspaceScenicTheme, type NavTab } from '../AppShell';
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
  const { theme } = useWorkspaceScenicTheme();

  if (loading || !data) {
    return (
      <div className="p-10 text-center text-xs text-[#475569] bg-white border border-white/80 rounded-2xl">
        正在加载企业营销工作台...
      </div>
    );
  }

  const textModel = data.providerStatuses.find((p) => p.capability === 'text');
  const totalKnowledgeCount = data.knowledgeStats.reduce((s, k) => s + k.count, 0);

  return (
    <div className="space-y-6">
      {/* 顶部沉浸式文旅风光总控横幅（与工作台当前风光主题实时联动） */}
      <section className="relative rounded-3xl overflow-hidden border border-white/75 shadow-[0_18px_45px_rgba(15,23,42,0.12)] min-h-[220px] flex flex-col justify-between p-6 sm:p-8 bg-[#0f172a]">
        {/* 全铺满背景图 */}
        <div className="absolute inset-0 pointer-events-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={theme.src}
            alt={theme.fullLabel}
            className="w-full h-full object-cover object-center transition-all duration-700"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(108deg, rgba(15, 23, 42, 0.68) 0%, rgba(15, 23, 42, 0.36) 56%, rgba(15, 23, 42, 0.16) 100%)',
            }}
          />
        </div>

        {/* 上半部：企业与场景徽标 + 标题 + 磨砂快捷入口 */}
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/18 backdrop-blur-md border border-white/30 text-white text-[11px] font-medium">
              <Compass className="w-3.5 h-3.5 text-sky-200" />
              <span>{data.organization.name}</span>
              <span className="text-white/50">·</span>
              <span className="text-white/85">{theme.fullLabel}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight hero-text-shadow">
              今日营销任务与成果总览
            </h1>
            <p className="text-xs sm:text-sm text-white/90 leading-relaxed hero-subtext-shadow">
              全链路闭环：企业入驻 → 知识库 → 专属 Agent → 市场情报 → 营销方案 → 内容生产 → 发布包 → 数据复盘
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 shrink-0">
            <button
              onClick={() => onNavigate('agent')}
              className="px-3.5 py-2 rounded-xl bg-white/18 hover:bg-white/28 backdrop-blur-md border border-white/35 text-white text-xs font-medium inline-flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Bot className="w-3.5 h-3.5 text-sky-200" /> 专属 Agent
            </button>
            <button
              onClick={() => onNavigate('campaigns')}
              className="px-3.5 py-2 rounded-xl bg-white/18 hover:bg-white/28 backdrop-blur-md border border-white/35 text-white text-xs font-medium inline-flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Target className="w-3.5 h-3.5 text-sky-200" /> 营销方案
            </button>
            <button
              onClick={() => onNavigate('creation')}
              className="px-4 py-2 rounded-xl bg-[#1d4ed8]/85 hover:bg-[#1d4ed8] backdrop-blur-md border border-white/35 text-white text-xs font-medium inline-flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" /> 发起内容生产
            </button>
          </div>
        </div>

        {/* 下半部：4 枚实时业务状态磨砂胶囊 */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-5 mt-2">
          {[
            { label: '企业知识文档', value: `${totalKnowledgeCount} 篇`, tab: 'knowledge' as NavTab },
            { label: '市场对标情报', value: `${data.summary.intelligenceCount} 条`, tab: 'intelligence' as NavTab },
            { label: '已产出营销稿件', value: `${data.summary.projectsCount} 篇`, tab: 'creation' as NavTab },
            { label: '待人工审核', value: `${data.summary.pendingReviewCount} 项`, tab: 'publish' as NavTab },
          ].map((stat) => (
            <button
              key={stat.label}
              onClick={() => onNavigate(stat.tab)}
              className="px-3.5 py-2.5 rounded-2xl bg-white/16 hover:bg-white/26 backdrop-blur-md border border-white/30 text-left transition-all cursor-pointer"
            >
              <div className="text-[11px] text-white/80">{stat.label}</div>
              <div className="text-base sm:text-lg font-semibold text-white mt-0.5 hero-subtext-shadow">{stat.value}</div>
            </button>
          ))}
        </div>
      </section>

      {/* 端到端业务闭环快捷通道（磨砂玻璃面板） */}
      <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3.5">
          <div className="text-xs font-semibold text-[#0f172a]">核心业务任务链路（点击进入对应环节）</div>
          <span className="text-[11px] text-[#64748b]">数据实时贯通 · 支持任意环节切入</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-xs">
          {[
            { step: '01', label: '企业与知识库', tab: 'knowledge' as NavTab, count: `${totalKnowledgeCount} 篇` },
            { step: '02', label: '产品与素材', tab: 'products' as NavTab, count: '画廊资产' },
            { step: '03', label: '专属 Agent', tab: 'agent' as NavTab, count: '8 角色就绪' },
            { step: '04', label: '市场与爆款', tab: 'intelligence' as NavTab, count: `${data.summary.intelligenceCount} 情报` },
            { step: '05', label: '营销方案', tab: 'campaigns' as NavTab, count: '7/30天计划' },
            { step: '06', label: '内容与生图', tab: 'creation' as NavTab, count: `${data.summary.projectsCount} 稿件` },
            { step: '07', label: '发布与复盘', tab: 'publish' as NavTab, count: `${data.summary.pendingReviewCount} 待审` },
          ].map((item) => (
            <button
              key={item.step}
              onClick={() => onNavigate(item.tab)}
              className="group p-3 rounded-xl bg-[#f8fafc] hover:bg-white/95 border border-[#e2e8f0] hover:border-[#93c5fd] text-left transition-all shadow-2xs cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-[#1d4ed8]">STEP {item.step}</span>
                <ArrowRight className="w-3 h-3 text-[#94a3b8] group-hover:text-[#1d4ed8] group-hover:translate-x-0.5 transition-all" />
              </div>
              <div className="font-medium text-[#0f172a] mt-1">{item.label}</div>
              <div className="text-[11px] text-[#64748b] mt-1">{item.count}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 两栏核心成果：待审核与最新内容成果 + 最新市场情报与系统状态 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <section className="lg:col-span-7 bg-white border border-[#e2e8f0] rounded-2xl p-5 space-y-3.5">
          <div className="flex items-center justify-between border-b border-[#e2e8f0]/75 pb-3">
            <h2 className="text-sm font-semibold text-[#0f172a] flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#1d4ed8]" />
              近期内容成果与待审核稿件 ({data.projects.length})
            </h2>
            <button
              onClick={() => onNavigate('publish')}
              className="text-xs text-[#1d4ed8] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              前往发布中心 <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {data.projects.length === 0 ? (
            <div className="py-10 text-center text-xs text-[#64748b]">
              暂无内容稿件，点击右上角「发起内容生产」开始创作。
            </div>
          ) : (
            <div className="space-y-2.5">
              {data.projects.map((p) => (
                <div
                  key={p.id}
                  onClick={() => onNavigate('publish')}
                  className="cursor-pointer p-3.5 rounded-xl bg-[#f8fafc] hover:bg-white/95 border border-[#e2e8f0] hover:border-[#93c5fd] flex items-center justify-between gap-3 transition-all"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-[#0f172a] truncate">{p.topic}</div>
                    <div className="text-[11px] text-[#64748b] mt-0.5">
                      平台：{p.target_platform} · 更新于 {p.updated_at}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-medium ${
                      p.review_status === 'published_recorded'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                        : 'bg-amber-50 text-amber-700 border border-amber-200/80'
                    }`}
                  >
                    {p.review_status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="lg:col-span-5 space-y-5">
          <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5 space-y-2.5">
            <div className="flex items-center justify-between border-b border-[#e2e8f0]/75 pb-2.5">
              <h2 className="text-sm font-semibold text-[#0f172a] flex items-center gap-1.5">
                <Radar className="w-4 h-4 text-[#1d4ed8]" /> 最新市场情报与对标
              </h2>
              <button
                onClick={() => onNavigate('intelligence')}
                className="text-xs text-[#1d4ed8] hover:underline cursor-pointer"
              >
                查看全部
              </button>
            </div>
            {data.intelligenceItems.slice(0, 4).map((item) => (
              <div key={item.id} className="p-3 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-xs">
                <div className="font-medium text-[#0f172a] line-clamp-1">{item.title}</div>
                <div className="text-[11px] text-[#64748b] mt-0.5">{item.source_name}</div>
              </div>
            ))}
          </div>

          <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#0f172a] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> 模型与合规状态
              </span>
              <button onClick={() => onNavigate('settings')} className="text-[#1d4ed8] hover:underline cursor-pointer">
                系统设置
              </button>
            </div>
            <div className="p-3 rounded-xl bg-[#f8fafc] border border-[#e2e8f0]">
              <div className="flex justify-between items-center gap-2">
                <span className="font-medium text-[#0f172a]">
                  文本模型：{textModel?.provider} / {textModel?.modelName}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/80 text-[10px] shrink-0">
                  {textModel?.status === 'connected' ? '真实密钥' : '测试模式'}
                </span>
              </div>
              <div className="text-[11px] text-[#64748b] mt-1">{textModel?.statusNote}</div>
            </div>
            <button
              onClick={() => onNavigate('review')}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#1d4ed8]/90 to-[#2563eb]/90 hover:from-[#1e40af] hover:to-[#1d4ed8] text-white font-medium inline-flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" /> 进入数据复盘与知识回流
            </button>
          </div>
        </section>
      </div>

      {/* 系统能力与接入状态矩阵 */}
      <section className="bg-white border border-[#e2e8f0] rounded-2xl p-5 space-y-3.5">
        <div className="flex items-center justify-between border-b border-[#e2e8f0]/75 pb-2.5">
          <h2 className="text-sm font-semibold text-[#0f172a] flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-[#1d4ed8]" /> 系统能力与真实接入状态矩阵
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {SYSTEM_CAPABILITY_MATRIX.map((cap) => (
            <div key={cap.name} className="p-3.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-xs space-y-1.5">
              <div className="flex items-start justify-between gap-1.5">
                <span className="font-medium text-[#0f172a]">{cap.name}</span>
                <span
                  className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    cap.status === 'verified'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/70'
                      : cap.status === 'demo'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200/70'
                      : cap.status === 'reserved'
                      ? 'bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe]/70'
                      : 'bg-red-50 text-red-700 border border-red-200/70'
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
