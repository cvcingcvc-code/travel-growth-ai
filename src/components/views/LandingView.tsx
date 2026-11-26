'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Bot,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Layers,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type { NavTab, OrgItem } from '../AppShell';

const HERO_SLIDES = [
  {
    id: 'waterfront-park',
    src: '/images/hero/hero-01-waterfront-park.webp',
    alt: '城市滨水文化公园与阳光咖啡窗景',
    label: '城市滨水文旅 · 阳光与空间美学',
  },
  {
    id: 'mountain-sunrise',
    src: '/images/hero/hero-02-mountain-sunrise.webp',
    alt: '春日樱花与云海山谷日出全景',
    label: '山海日出云境 · 东方自然意象',
  },
  {
    id: 'alpine-lake-resort',
    src: '/images/hero/hero-03-alpine-lake-resort.webp',
    alt: '暮色山湖露台与度假木屋群落',
    label: '秘境山湖度假 · 品质栖居体验',
  },
] as const;

const AUTOPLAY_INTERVAL_MS = 6000;

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

  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const goNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % HERO_SLIDES.length);
  }, []);

  const goPrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
  }, []);

  // 检测无障碍减少动态效果偏好
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);

  // 预加载其余轮播图片，避免切换闪烁
  useEffect(() => {
    if (typeof window === 'undefined') return;
    HERO_SLIDES.slice(1).forEach((slide) => {
      const img = new window.Image();
      img.src = slide.src;
    });
  }, []);

  // 每 6 秒自动切换，鼠标悬停或减少动态效果时暂停
  useEffect(() => {
    if (isPaused || reducedMotion) return;
    const timer = window.setInterval(goNext, AUTOPLAY_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [isPaused, reducedMotion, goNext, activeIndex]);

  // 滚动后顶部玻璃导航平滑过渡为浅色磨砂
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onScroll = () => setScrolled(window.scrollY > 48);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
    touchEndX.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const delta = touchStartX.current - touchEndX.current;
    if (Math.abs(delta) >= 40) {
      if (delta > 0) goNext();
      else goPrev();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const scrollToCases = () => {
    document.getElementById('demo-cases')?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a]">
      {/* 顶部半透明磨砂玻璃导航 */}
      <header
        className={`fixed top-0 inset-x-0 z-30 transition-all duration-300 ${
          scrolled
            ? 'bg-white/85 backdrop-blur-md border-b border-[#e2e8f0]/90 text-[#0f172a] shadow-xs'
            : 'bg-slate-950/20 backdrop-blur-md border-b border-white/15 text-white'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-sm shrink-0 transition-colors ${
                scrolled
                  ? 'bg-[#1d4ed8] text-white'
                  : 'bg-white/20 backdrop-blur-md border border-white/35 text-white'
              }`}
            >
              TG
            </div>
            <div className="min-w-0">
              <div className={`font-semibold text-sm truncate ${scrolled ? 'text-[#0f172a]' : 'text-white hero-subtext-shadow'}`}>
                TravelGrowth AI
              </div>
              <div className={`text-[11px] truncate ${scrolled ? 'text-[#64748b]' : 'text-white/80'}`}>
                企业专属 AI 营销运营工作台 · v2.1 路演体验版
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {spruce && (
              <button
                onClick={() => onEnterDemo(spruce.id, 'today')}
                className={`px-3 sm:px-3.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  scrolled
                    ? 'border border-[#e2e8f0] bg-white hover:bg-[#f1f5f9] text-[#0f172a]'
                    : 'bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/30 text-white'
                }`}
              >
                进入工作台
              </button>
            )}
            <button
              onClick={onStartCreate}
              className={`px-3.5 sm:px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                scrolled
                  ? 'bg-[#1d4ed8] hover:bg-[#1e40af] text-white shadow-xs'
                  : 'bg-[#1d4ed8]/80 hover:bg-[#1d4ed8]/95 backdrop-blur-md border border-white/30 text-white shadow-sm'
              }`}
            >
              创建我的企业
            </button>
          </div>
        </div>
      </header>

      {/* 全宽沉浸式首屏轮播 Hero */}
      <section
        aria-label="TravelGrowth AI 文旅营销平台首页封面轮播"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative w-full min-h-[100svh] sm:min-h-[680px] flex items-center overflow-hidden bg-[#0f172a]"
      >
        {/* 轮播背景图层：全铺满无白边黑边，1.2s 淡入淡出 + 轻微电影感推进 */}
        <div className="absolute inset-0">
          {HERO_SLIDES.map((slide, idx) => {
            const isActive = idx === activeIndex;
            return (
              <div
                key={slide.id}
                aria-hidden={!isActive}
                className={`absolute inset-0 transition-opacity duration-[1200ms] ease-in-out ${
                  isActive ? 'opacity-100 z-[1]' : 'opacity-0 z-0 pointer-events-none'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={slide.src}
                  alt={slide.alt}
                  loading={idx === 0 ? 'eager' : 'lazy'}
                  fetchPriority={idx === 0 ? 'high' : 'auto'}
                  decoding="async"
                  className={`w-full h-full object-cover object-center ${
                    isActive && !reducedMotion ? 'hero-slide-zoom' : ''
                  } ${isPaused ? 'hero-slide-zoom-paused' : ''}`}
                />
              </div>
            );
          })}

          {/* 轻柔定向渐变遮罩：保障左侧白色文字与顶部导航清晰可读，不让图片整体变暗 */}
          <div
            className="absolute inset-0 z-[2] pointer-events-none"
            style={{
              background:
                'linear-gradient(105deg, rgba(15, 23, 42, 0.56) 0%, rgba(15, 23, 42, 0.28) 48%, rgba(15, 23, 42, 0.08) 100%)',
            }}
          />
          <div
            className="absolute inset-0 z-[2] pointer-events-none"
            style={{
              background:
                'linear-gradient(180deg, rgba(15, 23, 42, 0.34) 0%, rgba(15, 23, 42, 0) 26%, rgba(15, 23, 42, 0) 72%, rgba(15, 23, 42, 0.42) 100%)',
            }}
          />
        </div>

        {/* 左右手动切换按钮（磨砂玻璃圆钮） */}
        <button
          type="button"
          onClick={goPrev}
          aria-label="上一张封面"
          className="hidden sm:flex absolute left-4 lg:left-7 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-slate-950/25 hover:bg-slate-950/45 backdrop-blur-md border border-white/25 text-white items-center justify-center transition-all cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={goNext}
          aria-label="下一张封面"
          className="hidden sm:flex absolute right-4 lg:right-7 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-slate-950/25 hover:bg-slate-950/45 backdrop-blur-md border border-white/25 text-white items-center justify-center transition-all cursor-pointer"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* 首屏核心业务文案与磨砂玻璃行动入口 */}
        <div className="relative z-10 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-14 pt-24 pb-28 sm:pt-28 sm:pb-24">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/30 text-white text-xs font-medium shadow-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-200 shrink-0" />
              <span>多企业严格隔离 · 防编造事实溯源 · 人工审核兜底</span>
            </div>

            <div className="space-y-4">
              <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight text-white leading-[1.18] hero-text-shadow">
                把企业的真实资料，变成持续产出的专属 AI 营销团队
              </h1>
              <p className="text-sm sm:text-lg text-white/90 leading-relaxed max-w-2xl hero-subtext-shadow">
                无需阅读技术文档或理解 API。导入企业资料即可构建可视化知识库与专属营销 Agent，完整跑通同行爆款调研、营销方案、小红书/抖音图文创作、发布包导出与数据复盘回流。
              </p>
            </div>

            {/* 两大核心磨砂玻璃入口按钮 */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-3.5 pt-2">
              {spruce && (
                <button
                  onClick={() => onEnterDemo(spruce.id, 'today')}
                  className="px-6 py-3.5 rounded-xl bg-[#1d4ed8]/75 hover:bg-[#1d4ed8]/90 backdrop-blur-md border border-white/35 text-white text-sm font-medium inline-flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(15,23,42,0.28)] transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>A. 体验完整演示案例（推荐）</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={onStartCreate}
                className="px-6 py-3.5 rounded-xl bg-white/18 hover:bg-white/28 backdrop-blur-md border border-white/40 text-white text-sm font-medium inline-flex items-center justify-center gap-2 shadow-[0_8px_24px_rgba(15,23,42,0.18)] transition-all cursor-pointer"
              >
                <Building2 className="w-4 h-4 text-sky-100" />
                <span>B. 创建我的企业（独立体验空间）</span>
              </button>
            </div>
          </div>
        </div>

        {/* 底部轮播指示器 + 场景标签 + 向下探索引导 */}
        <div className="absolute bottom-5 sm:bottom-7 inset-x-0 z-20 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* 轮播指示器与移动端左右切图 */}
            <div className="inline-flex items-center gap-3 px-3.5 py-2 rounded-full bg-slate-950/30 backdrop-blur-md border border-white/20 text-white">
              <button
                type="button"
                onClick={goPrev}
                aria-label="切换到上一张封面"
                className="sm:hidden p-0.5 text-white/80 hover:text-white cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2" role="tablist" aria-label="首页封面切换指示器">
                {HERO_SLIDES.map((slide, idx) => {
                  const isActive = idx === activeIndex;
                  return (
                    <button
                      key={slide.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      aria-label={`切换到第 ${idx + 1} 张封面：${slide.label}`}
                      onClick={() => setActiveIndex(idx)}
                      className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                        isActive ? 'w-7 bg-white shadow-xs' : 'w-2 bg-white/45 hover:bg-white/75'
                      }`}
                    />
                  );
                })}
              </div>
              <span className="text-[11px] text-white/85 pl-1 border-l border-white/20 hidden xs:inline sm:inline">
                {HERO_SLIDES[activeIndex]?.label}
              </span>
              <button
                type="button"
                onClick={goNext}
                aria-label="切换到下一张封面"
                className="sm:hidden p-0.5 text-white/80 hover:text-white cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* 向下探索按钮 */}
            <button
              type="button"
              onClick={scrollToCases}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-950/25 hover:bg-slate-950/40 backdrop-blur-md border border-white/20 text-white/90 text-xs transition-all cursor-pointer"
            >
              <span>向下探索演示案例</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      <main id="demo-cases" className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-12">
        {/* 精选完整演示案例双卡片 */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
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
                      className="flex-1 py-2 rounded-md bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-medium cursor-pointer"
                    >
                      立即体验该案例
                    </button>
                    <button
                      onClick={() => onEnterDemo(spruce.id, 'publish')}
                      className="px-3 py-2 rounded-md border border-[#e2e8f0] hover:bg-[#f8fafc] text-xs text-[#0f172a] cursor-pointer"
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
                      className="flex-1 py-2 rounded-md bg-[#0f172a] hover:bg-slate-800 text-white text-xs font-medium cursor-pointer"
                    >
                      查看知识库与图谱
                    </button>
                    <button
                      onClick={() => onEnterDemo(shanhai.id, 'publish')}
                      className="px-3 py-2 rounded-md border border-[#e2e8f0] hover:bg-[#f8fafc] text-xs text-[#0f172a] cursor-pointer"
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
          <div className="flex flex-wrap items-center justify-between gap-2">
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
                className="p-3 rounded-lg bg-[#f8fafc] hover:bg-[#eff6ff] border border-[#e2e8f0] hover:border-[#bfdbfe] text-left transition-colors cursor-pointer"
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
