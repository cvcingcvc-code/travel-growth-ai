'use client';

import React from 'react';
import { ArrowRight, Bot, Building2, CheckCircle2, Layers, ShieldCheck, Sparkles } from 'lucide-react';
import type { NavTab, OrgItem } from '../AppShell';

const JOURNEY_STEPS: Array<{ num: string; title: string; desc: string; tab: NavTab }> = [
  { num: '01', title: '企业资料', desc: '无截断导入文档并识别待核实项', tab: 'profile' },
  { num: '02', title: '可视化知识库', desc: '真实知识关系图与检索溯源', tab: 'knowledge' },
  { num: '03', title: '产品与素材', desc: '产品档案与版权素材管理', tab: 'products' },
  { num: '04', title: '专属 Agent', desc: '8 大角色编排与真实步骤日志', tab: 'agent' },
  { num: '05', title: '市场分析', desc: '同行爆款拆解与 3 种营销方向', tab: 'intelligence' },
  { num: '06', title: '营销方案', desc: '7 天/30 天计划与版本审批', tab: 'campaigns' },
  { num: '07', title: '内容创作', desc: '多平台图文与生图工作台', tab: 'creation' },
  { num: '08', title: '发布成果', desc: '手机图文预览、一键复制与 ZIP', tab: 'publish' },
  { num: '09', title: '数据复盘', desc: '真实指标复盘与知识回流', tab: 'review' },
];

export function LandingView({
  orgs,
  onEnterDemo,
  onStartCreate,
}: {
  orgs: OrgItem[];
  onEnterDemo: (orgId: string, tab?: NavTab) => void;
  onStartCreate: () => void;
}) {
  const spruce = orgs.find((o) => o.id === 'org_demo_spruce') || orgs[0];
  const shanhai = orgs.find((o) => o.id === 'org_demo_shanhai') || orgs[1];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a]">
      {/* 顶部极简企业导航 */}
      <header className="bg-white border-b border-[#e2e8f0] sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1d4ed8] text-white flex items-center justify-center font-semibold text-sm">
              TG
            </div>
            <div>
              <div className="font-semibold text-sm text-[#0f172a]">TravelGrowth AI</div>
              <div className="text-[11px] text-[#64748b]">企业专属 AI 营销运营工作台 · v2.1 路演体验版</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            {spruce && (
              <button
                onClick={() => onEnterDemo(spruce.id, 'today')}
                className="px-3.5 py-2 rounded-md border border-[#e2e8f0] bg-white hover:bg-[#f1f5f9] text-xs font-medium text-[#0f172a]"
              >
                进入工作台
              </button>
            )}
            <button
              onClick={onStartCreate}
              className="px-4 py-2 rounded-md bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-medium"
            >
              创建我的企业
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-12">
        {/* Hero 区 */}
        <section className="bg-white border border-[#e2e8f0] rounded-2xl p-6 sm:p-10 shadow-xs space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#eff6ff] border border-[#bfdbfe] text-[#1d4ed8] text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>多企业严格隔离 · 防编造事实溯源 · 人工审核兜底</span>
          </div>
          <div className="max-w-3xl space-y-3">
            <h1 className="text-2xl sm:text-4xl font-semibold tracking-tight text-[#0f172a] leading-tight">
              把企业的真实资料，变成持续产出的专属 AI 营销团队
            </h1>
            <p className="text-sm sm:text-base text-[#475569] leading-relaxed">
              无需阅读技术文档或理解 API。导入企业资料即可构建可视化知识库与专属营销 Agent，完整跑通同行爆款调研、营销方案、小红书/抖音图文创作、发布包导出与数据复盘回流。
            </p>
          </div>

          {/* 两大核心入口 */}
          <div className="flex flex-wrap gap-3 pt-2">
            {spruce && (
              <button
                onClick={() => onEnterDemo(spruce.id, 'today')}
                className="px-5 py-3 rounded-lg bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-sm font-medium inline-flex items-center gap-2 shadow-xs"
              >
                <Sparkles className="w-4 h-4" />
                <span>A. 体验完整演示案例（推荐）</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onStartCreate}
              className="px-5 py-3 rounded-lg border border-[#cbd5e1] bg-white hover:bg-[#f8fafc] text-[#0f172a] text-sm font-medium inline-flex items-center gap-2"
            >
              <Building2 className="w-4 h-4 text-[#1d4ed8]" />
              <span>B. 创建我的企业（独立体验空间）</span>
            </button>
          </div>
        </section>

        {/* 精选完整演示案例双卡片 */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#0f172a]">精选预置演示案例（含真实 AI 概念宣传图与完整业务闭环）</h2>
            <span className="text-xs text-[#64748b]">均明确标记为演示数据，不影响正式企业</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {spruce && (
              <div className="bg-white border border-[#e2e8f0] hover:border-[#2563eb] rounded-xl overflow-hidden transition-colors flex flex-col">
                <div className="grid grid-cols-3 gap-1 bg-[#f1f5f9] h-44 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/demo-assets/spruce-cabin.jpg" alt="临溪云杉木屋" className="w-full h-full object-cover" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/demo-assets/spruce-craft.jpg" alt="亲子自然手作" className="w-full h-full object-cover" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/demo-assets/spruce-coffee.jpg" alt="溪畔手冲咖啡" className="w-full h-full object-cover" />
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-[#eff6ff] text-[#1d4ed8] text-[11px] font-medium">2.0 全链路演示</span>
                      <h3 className="font-semibold text-base text-[#0f172a]">{spruce.name}</h3>
                    </div>
                    <p className="text-xs text-[#475569] leading-relaxed">
                      包含 3 个产品、六类知识库、专属 Agent 诊断日志、已审批 7/30 天方案、3 篇挂载真实 AI 宣传图的小红书图文、发布包及复盘回流。
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEnterDemo(spruce.id, 'today')}
                      className="flex-1 py-2 rounded-md bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-medium"
                    >
                      立即体验该案例
                    </button>
                    <button
                      onClick={() => onEnterDemo(spruce.id, 'publish')}
                      className="px-3 py-2 rounded-md border border-[#e2e8f0] hover:bg-[#f8fafc] text-xs text-[#0f172a]"
                    >
                      直接看图文成果
                    </button>
                  </div>
                </div>
              </div>
            )}

            {shanhai && (
              <div className="bg-white border border-[#e2e8f0] hover:border-[#2563eb] rounded-xl overflow-hidden transition-colors flex flex-col">
                <div className="grid grid-cols-3 gap-1 bg-[#f1f5f9] h-44 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/demo-assets/shanhai-d01-cover.jpg" alt="山海拾光 D01" className="w-full h-full object-cover" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/demo-assets/shanhai-d02-cover.jpg" alt="山海拾光 D02" className="w-full h-full object-cover" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/demo-assets/shanhai-d03-cover.jpg" alt="山海拾光 D03" className="w-full h-full object-cover" />
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-[11px] font-medium">小红书专题案例</span>
                      <h3 className="font-semibold text-base text-[#0f172a]">{shanhai.name}</h3>
                    </div>
                    <p className="text-xs text-[#475569] leading-relaxed">
                      包含严谨的待核实边界（V01–V08）、公开对标观察（B01–B03）、三大可复用策略卡及多篇 6 页小红书图文分镜方案。
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEnterDemo(shanhai.id, 'knowledge')}
                      className="flex-1 py-2 rounded-md bg-[#0f172a] hover:bg-slate-800 text-white text-xs font-medium"
                    >
                      查看知识库与图谱
                    </button>
                    <button
                      onClick={() => onEnterDemo(shanhai.id, 'publish')}
                      className="px-3 py-2 rounded-md border border-[#e2e8f0] hover:bg-[#f8fafc] text-xs text-[#0f172a]"
                    >
                      查看小红书成果
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 9 步新手引导流程图 */}
        <section className="bg-white border border-[#e2e8f0] rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#0f172a] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#1d4ed8]" /> 9 步完整体验引导（点击任意步骤直达）
            </h2>
            <span className="text-xs text-[#64748b] inline-flex items-center gap-1">
              <Bot className="w-3.5 h-3.5 text-[#1d4ed8]" /> 全程支持浏览器前进 / 后退与刷新恢复
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-9 gap-2.5">
            {JOURNEY_STEPS.map((st) => (
              <button
                key={st.num}
                onClick={() => spruce && onEnterDemo(spruce.id, st.tab)}
                className="p-3 rounded-lg bg-[#f8fafc] hover:bg-[#eff6ff] border border-[#e2e8f0] hover:border-[#bfdbfe] text-left transition-colors"
              >
                <div className="text-[10px] font-semibold text-[#1d4ed8]">STEP {st.num}</div>
                <div className="text-xs font-semibold text-[#0f172a] mt-1">{st.title}</div>
                <div className="text-[11px] text-[#64748b] mt-1 leading-snug">{st.desc}</div>
              </button>
            ))}
          </div>
          <div className="pt-2 border-t border-[#e2e8f0] flex flex-wrap gap-4 text-[11px] text-[#64748b]">
            <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 支持一键导出体验数据 JSON 备份</span>
            <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 所有数据按企业严格隔离，互不干扰</span>
            <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 无外部大模型密钥时如实标注运行状态</span>
          </div>
        </section>
      </main>
    </div>
  );
}
