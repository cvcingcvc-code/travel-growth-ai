'use client';

import React from 'react';
import { ArrowRight, BookOpen, CheckCircle2, Clock, Cpu, Radar, Sparkles, Layers } from 'lucide-react';
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
  strategies: Array<{ id: string; title: string; target_platform: string; hook_pattern: string; is_demo: number }>;
  projects: Array<{ id: string; topic: string; review_status: string; target_platform: string; updated_at: string; is_demo: number }>;
  knowledgeStats: Array<{ category: string; count: number; verified_count: number }>;
  providerStatuses: Array<{ capability: string; provider: string; modelName: string; status: string; statusNote: string }>;
  modelRuns: Array<{ id: string; task_type: string; provider: string; model_name: string; status: string; duration_ms: number; created_at: string }>;
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
      <div className="p-8 text-center text-sm text-[#53605a] bg-[#fcfbf8] border border-[#dfd9cb] rounded">
        正在加载今日工作台数据...
      </div>
    );
  }

  const statCards = [
    { label: '市场情报条目', value: data.summary.intelligenceCount, action: () => onNavigate('intelligence'), hint: '去采集/导入' },
    { label: '爆款案例与策略', value: `${data.summary.casesCount} / ${data.summary.strategiesCount}`, action: () => onNavigate('analysis'), hint: '拆解案例' },
    { label: '创作项目总数', value: data.summary.projectsCount, action: () => onNavigate('creation'), hint: '进入创作' },
    { label: '待人工审核', value: data.summary.pendingReviewCount, action: () => onNavigate('creation'), hint: '立即审核' },
  ];

  const textModel = data.providerStatuses.find((p) => p.capability === 'text');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[#183a30]">今日文旅营销工作台</h1>
          <p className="text-xs text-[#53605a] mt-0.5">
            闭环链路：市场情报 → 爆款拆解 → 知识库检索 → AI 创作 → 人工审核 → 复盘沉淀
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onNavigate('intelligence')}
            className="px-3 py-1.5 rounded border border-[#183a30] text-[#183a30] text-xs font-medium hover:bg-[#ebe6da]"
          >
            + 录入市场情报
          </button>
          <button
            onClick={() => onNavigate('creation')}
            className="px-3.5 py-1.5 rounded bg-[#183a30] text-[#fcfbf8] text-xs font-medium hover:bg-[#214e41] inline-flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>从知识库发起创作</span>
          </button>
        </div>
      </div>

      {/* 顶部核心数字 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((c) => (
          <div
            key={c.label}
            onClick={c.action}
            className="cursor-pointer bg-[#fcfbf8] border border-[#dfd9cb] hover:border-[#183a30] rounded p-4 transition-colors"
          >
            <div className="text-xs text-[#53605a]">{c.label}</div>
            <div className="text-2xl font-semibold text-[#183a30] mt-1">{c.value}</div>
            <div className="text-[11px] text-[#4c7364] mt-2 inline-flex items-center gap-1">
              <span>{c.hint}</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        ))}
      </div>

      {/* 中部三栏：情报 + 创作与待审核 + 知识库与模型状态 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 今日市场情报与策略 */}
        <section className="bg-[#fcfbf8] border border-[#dfd9cb] rounded p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#ebe6da] pb-2">
            <h2 className="text-sm font-semibold text-[#183a30] flex items-center gap-1.5">
              <Radar className="w-4 h-4 text-[#4c7364]" />
              今日市场情报与热点
            </h2>
            <button onClick={() => onNavigate('intelligence')} className="text-xs text-[#4c7364] hover:underline">
              全部
            </button>
          </div>
          {data.intelligenceItems.length === 0 ? (
            <div className="text-xs text-[#7c8781] py-6 text-center">暂无情报，请前往情报中心录入或导入。</div>
          ) : (
            <ul className="space-y-2.5">
              {data.intelligenceItems.map((item) => (
                <li key={item.id} className="p-2.5 rounded bg-[#f5f2eb] border border-[#e5dfd2]">
                  <div className="text-xs font-medium text-[#1a2420] line-clamp-1">{item.title}</div>
                  <div className="flex items-center justify-between text-[11px] text-[#7c8781] mt-1">
                    <span>{item.source_name}</span>
                    {item.is_demo ? <span className="text-[#b48446]">演示</span> : <span>真实</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 创作任务与待审核 */}
        <section className="bg-[#fcfbf8] border border-[#dfd9cb] rounded p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#ebe6da] pb-2">
            <h2 className="text-sm font-semibold text-[#183a30] flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#b48446]" />
              创作任务与待审核内容
            </h2>
            <button onClick={() => onNavigate('creation')} className="text-xs text-[#4c7364] hover:underline">
              进入工作台
            </button>
          </div>
          {data.projects.length === 0 ? (
            <div className="text-xs text-[#7c8781] py-6 text-center">当前企业尚无创作草稿，点击右上角发起创作。</div>
          ) : (
            <ul className="space-y-2.5">
              {data.projects.map((p) => (
                <li key={p.id} className="p-2.5 rounded bg-[#f5f2eb] border border-[#e5dfd2] flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-[#1a2420] truncate">{p.topic}</div>
                    <div className="text-[11px] text-[#7c8781] mt-1">平台：{p.target_platform}</div>
                  </div>
                  <span className="shrink-0 px-2 py-0.5 text-[10px] rounded bg-[#fcfbf8] border border-[#dfd9cb] text-[#53605a]">
                    {p.review_status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 知识库与模型任务状态 */}
        <section className="bg-[#fcfbf8] border border-[#dfd9cb] rounded p-4 space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-[#ebe6da] pb-2 mb-2">
              <h2 className="text-sm font-semibold text-[#183a30] flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-[#4c7364]" />
                六类知识库状态
              </h2>
              <button onClick={() => onNavigate('knowledge')} className="text-xs text-[#4c7364] hover:underline">
                管理
              </button>
            </div>
            {data.knowledgeStats.length === 0 ? (
              <div className="text-xs text-[#7c8781] py-2">暂无知识文档，建议先补充 A/B/C 类核心资料。</div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {data.knowledgeStats.map((k) => (
                  <div key={k.category} className="p-2 rounded bg-[#f5f2eb] text-xs">
                    <div className="text-[#53605a] text-[11px]">{k.category}</div>
                    <div className="font-medium text-[#183a30] mt-0.5">
                      {k.count} 篇（已核实 {k.verified_count}）
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between border-b border-[#ebe6da] pb-2 mb-2">
              <h2 className="text-sm font-semibold text-[#183a30] flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-[#4c7364]" />
                模型与系统运行状态
              </h2>
              <button onClick={() => onNavigate('models')} className="text-xs text-[#4c7364] hover:underline">
                配置
              </button>
            </div>
            <div className="p-2.5 rounded bg-[#f5f2eb] border border-[#e5dfd2] text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-medium">文本模型：{textModel?.provider} / {textModel?.modelName}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] ${textModel?.status === 'connected' ? 'bg-[#e3ede8] text-[#183a30]' : 'bg-[#ebe6da] text-[#8a6534]'}`}>
                  {textModel?.status === 'connected' ? '真实已接通' : textModel?.status === 'test_mode_ready' ? '测试模式' : '未配置'}
                </span>
              </div>
              <div className="text-[11px] text-[#53605a]">{textModel?.statusNote}</div>
            </div>
            {data.modelRuns.slice(0, 2).map((r) => (
              <div key={r.id} className="mt-2 flex items-center justify-between text-[11px] text-[#53605a]">
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-[#4c7364]" />
                  {r.task_type} ({r.status})
                </span>
                <span>{r.duration_ms}ms</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* 系统能力与接入状态矩阵 */}
      <section className="bg-[#fcfbf8] border border-[#dfd9cb] rounded p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ebe6da] pb-2">
          <h2 className="text-sm font-semibold text-[#183a30] flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-[#4c7364]" />
            系统功能接入状态矩阵（透明区分真实能力 / Demo / 预留 / 未接通）
          </h2>
          <div className="flex flex-wrap gap-2 text-[11px]">
            <button onClick={() => onNavigate('intelligence')} className="px-2 py-0.5 rounded bg-[#f5f2eb] hover:bg-[#ebe6da] text-[#183a30]">1. 情报采集 →</button>
            <button onClick={() => onNavigate('analysis')} className="px-2 py-0.5 rounded bg-[#f5f2eb] hover:bg-[#ebe6da] text-[#183a30]">2. 爆款分析 →</button>
            <button onClick={() => onNavigate('knowledge')} className="px-2 py-0.5 rounded bg-[#f5f2eb] hover:bg-[#ebe6da] text-[#183a30]">3. 知识检索 →</button>
            <button onClick={() => onNavigate('creation')} className="px-2 py-0.5 rounded bg-[#183a30] text-white">4. AI 图文创作</button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {SYSTEM_CAPABILITY_MATRIX.map((cap) => (
            <div key={cap.name} className="p-3 rounded bg-[#f5f2eb] border border-[#e5dfd2] text-xs space-y-1">
              <div className="flex items-start justify-between gap-1.5">
                <span className="font-medium text-[#1a2420]">{cap.name}</span>
                <span
                  className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] ${
                    cap.status === 'verified'
                      ? 'bg-[#e3ede8] text-[#183a30]'
                      : cap.status === 'demo'
                      ? 'bg-[#ebe6da] text-[#8a6534]'
                      : cap.status === 'reserved'
                      ? 'bg-[#e6ebf0] text-[#3a556e]'
                      : 'bg-[#f4e5e1] text-[#b05b43]'
                  }`}
                >
                  {cap.label}
                </span>
              </div>
              <div className="text-[11px] text-[#53605a] leading-relaxed">{cap.detail}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
