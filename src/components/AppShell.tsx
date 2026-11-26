'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Building2,
  BookOpen,
  Package,
  Bot,
  Radar,
  Target,
  PenTool,
  Send,
  BarChart3,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Bell,
  Plus,
  Menu,
  X,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  Download,
  Sparkles,
} from 'lucide-react';

export type NavTab =
  | 'landing'
  | 'today'
  | 'profile'
  | 'knowledge'
  | 'products'
  | 'agent'
  | 'intelligence'
  | 'campaigns'
  | 'creation'
  | 'publish'
  | 'review'
  | 'settings';

export interface OrgItem {
  id: string;
  name: string;
  industry_type: string;
  location: string;
  is_demo: number;
}

export type ScenicThemeId = 'waterfront' | 'sunrise' | 'lake';

export interface ScenicThemeOption {
  id: ScenicThemeId;
  shortLabel: string;
  fullLabel: string;
  src: string;
}

export const WORKSPACE_SCENIC_THEMES: ScenicThemeOption[] = [
  {
    id: 'waterfront',
    shortLabel: '晴光',
    fullLabel: '城市滨水文旅 · 阳光与空间美学',
    src: '/images/hero/hero-01-waterfront-park.webp',
  },
  {
    id: 'sunrise',
    shortLabel: '云海',
    fullLabel: '山海日出云境 · 东方自然意象',
    src: '/images/hero/hero-02-mountain-sunrise.webp',
  },
  {
    id: 'lake',
    shortLabel: '山湖',
    fullLabel: '秘境山湖度假 · 品质栖居体验',
    src: '/images/hero/hero-03-alpine-lake-resort.webp',
  },
];

const WorkspaceThemeContext = createContext<{
  theme: ScenicThemeOption;
  setThemeId: (id: ScenicThemeId) => void;
}>({
  theme: WORKSPACE_SCENIC_THEMES[0],
  setThemeId: () => {},
});

export function useWorkspaceScenicTheme() {
  return useContext(WorkspaceThemeContext);
}

export const NAV_GROUPS: Array<{
  group: string;
  items: Array<{ id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }>;
}> = [
  {
    group: '企业管理',
    items: [
      { id: 'today', label: '今日工作台', icon: LayoutDashboard },
      { id: 'profile', label: '企业档案', icon: Building2 },
      { id: 'knowledge', label: '企业知识库', icon: BookOpen },
      { id: 'products', label: '产品与素材', icon: Package },
    ],
  },
  {
    group: '智能营销',
    items: [
      { id: 'agent', label: '专属 Agent', icon: Bot },
      { id: 'intelligence', label: '市场情报', icon: Radar },
      { id: 'campaigns', label: '营销方案', icon: Target },
    ],
  },
  {
    group: '内容运营',
    items: [
      { id: 'creation', label: '内容生产', icon: PenTool },
      { id: 'publish', label: '发布中心', icon: Send },
      { id: 'review', label: '数据复盘', icon: BarChart3 },
    ],
  },
  {
    group: '系统管理',
    items: [{ id: 'settings', label: '系统设置', icon: Settings }],
  },
];

const FLOW_ORDER: NavTab[] = [
  'today',
  'profile',
  'knowledge',
  'products',
  'agent',
  'intelligence',
  'campaigns',
  'creation',
  'publish',
  'review',
];

const GROUP_DEFAULT_TAB: Record<string, NavTab> = {
  企业管理: 'profile',
  智能营销: 'agent',
  内容运营: 'creation',
  系统管理: 'settings',
};

function findMeta(tab: NavTab) {
  for (const g of NAV_GROUPS) {
    const found = g.items.find((i) => i.id === tab);
    if (found) {
      return {
        group: g.group,
        groupTab: GROUP_DEFAULT_TAB[g.group] || 'today',
        label: found.label,
      };
    }
  }
  return { group: '企业管理', groupTab: 'profile' as NavTab, label: '体验首页' };
}

function buildRouteHref(tab: NavTab, orgId: string) {
  const sp = new URLSearchParams();
  if (tab !== 'landing') sp.set('view', tab);
  if (orgId) sp.set('org', orgId);
  return sp.toString() ? `/?${sp.toString()}` : '/';
}

const THEME_STORAGE_KEY = 'tg_workspace_scenic_theme_v1';

export function AppShell({
  activeTab,
  onTabChange,
  onGoBack,
  orgs,
  activeOrgId,
  onOrgChange,
  onOpenOnboarding,
  pendingReviewCount = 0,
  realAgentStatus,
  children,
}: {
  activeTab: NavTab;
  onTabChange: (tab: NavTab, itemId?: string) => void;
  onGoBack: () => void;
  orgs: OrgItem[];
  activeOrgId: string;
  onOrgChange: (orgId: string) => void;
  onOpenOnboarding: () => void;
  pendingReviewCount?: number;
  realAgentStatus?: { label: string; isLiveModel: boolean; stepCount: number };
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    knowledge: Array<{ documentId?: string; title: string; category: string }>;
    products: Array<{ id: string; name: string }>;
    campaigns: Array<{ id: string; title: string }>;
    creations: Array<{ id: string; topic: string }>;
  } | null>(null);
  const [showNotif, setShowNotif] = useState(false);
  const [themeId, setThemeIdState] = useState<ScenicThemeId>('waterfront');

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(THEME_STORAGE_KEY) as ScenicThemeId | null;
      if (saved && WORKSPACE_SCENIC_THEMES.some((t) => t.id === saved)) {
        setThemeIdState(saved);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const setThemeId = (nextId: ScenicThemeId) => {
    setThemeIdState(nextId);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextId);
    } catch {
      // ignore storage errors
    }
  };

  const activeTheme = WORKSPACE_SCENIC_THEMES.find((t) => t.id === themeId) || WORKSPACE_SCENIC_THEMES[0];

  const activeOrg = orgs.find((o) => o.id === activeOrgId);
  const meta = findMeta(activeTab);
  const flowIdx = FLOW_ORDER.indexOf(activeTab);
  const prevTab = flowIdx > 0 ? FLOW_ORDER[flowIdx - 1] : null;
  const nextTab = flowIdx >= 0 && flowIdx < FLOW_ORDER.length - 1 ? FLOW_ORDER[flowIdx + 1] : null;

  async function handleGlobalSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim() || !activeOrgId) {
      setSearchResults(null);
      return;
    }
    const res = await fetch(`/api/v1/search?q=${encodeURIComponent(searchQuery)}`, {
      headers: { 'x-organization-id': activeOrgId },
    });
    const json = await res.json();
    if (json.ok) setSearchResults(json.data);
  }

  return (
    <WorkspaceThemeContext.Provider value={{ theme: activeTheme, setThemeId }}>
      <div className="relative min-h-screen flex flex-col lg:flex-row text-[#0f172a] bg-[#eef3f9]">
        {/* 全屏文旅风光呼吸背景层：保留自然光影与空间层次，叠加珍珠薄雾柔光罩保障文字清晰 */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          {WORKSPACE_SCENIC_THEMES.map((item) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={item.id}
              src={item.src}
              alt=""
              aria-hidden="true"
              className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-700 ease-in-out scale-[1.03] ${
                item.id === activeTheme.id ? 'opacity-100' : 'opacity-0'
              }`}
            />
          ))}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(135deg, rgba(240, 246, 255, 0.78) 0%, rgba(248, 250, 252, 0.70) 48%, rgba(238, 244, 252, 0.78) 100%)',
            }}
          />
        </div>

        {/* 左侧悬浮磨砂玻璃 4 分组导航栏 */}
        <aside
          className={`relative z-20 hidden lg:flex lg:flex-col bg-white/68 backdrop-blur-xl border-r border-white/75 shadow-[4px_0_30px_rgba(15,23,42,0.05)] transition-all duration-200 shrink-0 sticky top-0 h-screen ${
            collapsed ? 'w-[70px]' : 'w-60'
          }`}
        >
          <div className="h-14 px-3.5 border-b border-white/70 flex items-center justify-between">
            {!collapsed && (
              <button
                onClick={() => onTabChange('landing')}
                className="flex items-center gap-2.5 min-w-0 text-left hover:opacity-85 cursor-pointer"
                title="返回客户体验首页"
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#1d4ed8] to-[#2563eb] text-white flex items-center justify-center font-semibold text-xs shrink-0 shadow-xs">
                  TG
                </div>
                <div className="truncate">
                  <div className="font-semibold text-sm text-[#0f172a] leading-tight">TravelGrowth AI</div>
                  <div className="text-[10px] text-[#475569]">返回体验首页</div>
                </div>
              </button>
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1.5 rounded-lg text-[#475569] hover:bg-white/75 hover:text-[#0f172a] mx-auto lg:mx-0 transition-colors cursor-pointer"
              title={collapsed ? '展开导航' : '折叠导航'}
            >
              {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
          </div>

          <nav className="flex-1 p-2.5 space-y-4 overflow-y-auto">
            {NAV_GROUPS.map((g) => (
              <div key={g.group} className="space-y-1">
                {!collapsed && (
                  <div className="px-2.5 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#64748b]">
                    {g.group}
                  </div>
                )}
                {g.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onTabChange(item.id)}
                      title={collapsed ? item.label : undefined}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] transition-all cursor-pointer ${
                        isActive
                          ? 'bg-gradient-to-r from-[#1d4ed8] to-[#2563eb] text-white font-medium shadow-[0_6px_16px_rgba(29,78,216,0.26)]'
                          : 'text-[#334155] hover:bg-white/75 hover:text-[#0f172a]'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#64748b]'}`} />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          {!collapsed && (
            <div className="p-3 border-t border-white/70 text-[11px] text-[#475569] space-y-2">
              {/* 微缩文旅风光主题卡 */}
              <div className="relative rounded-xl overflow-hidden h-16 border border-white/80 shadow-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={activeTheme.src} alt={activeTheme.fullLabel} className="w-full h-full object-cover" />
                <div
                  className="absolute inset-0 flex flex-col justify-end p-2"
                  style={{
                    background: 'linear-gradient(180deg, rgba(15,23,42,0.12) 0%, rgba(15,23,42,0.68) 100%)',
                  }}
                >
                  <div className="text-[10px] text-white/95 font-medium truncate flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5 text-sky-200 shrink-0" />
                    <span className="truncate">{activeTheme.fullLabel}</span>
                  </div>
                </div>
              </div>

              <a
                href={`/api/v1/export?organizationId=${encodeURIComponent(activeOrgId)}`}
                download
                className="w-full py-1.5 px-2.5 rounded-xl border border-white/80 bg-white/75 hover:bg-white text-[#0f172a] inline-flex items-center justify-center gap-1.5 font-medium shadow-2xs transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-[#1d4ed8]" /> 导出企业数据备份
              </a>
              <div className="text-[10px] text-[#64748b] text-center">数据按企业严格隔离</div>
            </div>
          )}
        </aside>

        {/* 右侧主区域 */}
        <div className="relative z-10 flex-1 flex flex-col min-w-0">
          {/* 顶部半透明磨砂玻璃工具栏 */}
          <header className="bg-white/68 backdrop-blur-xl border-b border-white/75 sticky top-0 z-30 shadow-[0_4px_24px_rgba(15,23,42,0.03)]">
            <div className="h-14 px-4 lg:px-6 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  onClick={() => setMobileOpen(!mobileOpen)}
                  className="lg:hidden p-1.5 rounded-lg border border-white/80 bg-white/75 text-[#334155]"
                  aria-label="打开菜单"
                >
                  {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                </button>

                <button
                  onClick={onGoBack}
                  className="p-1.5 rounded-lg border border-white/80 bg-white/75 text-[#334155] hover:bg-white transition-colors cursor-pointer"
                  title="返回上一级"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-1.5 bg-white/75 backdrop-blur-md border border-white/85 rounded-xl px-2.5 py-1 shadow-2xs">
                  <Building2 className="w-3.5 h-3.5 text-[#1d4ed8] shrink-0" />
                  <select
                    value={activeOrgId}
                    onChange={(e) => onOrgChange(e.target.value)}
                    aria-label="切换企业工作空间"
                    className="bg-transparent text-xs font-medium text-[#0f172a] focus:outline-none max-w-[140px] sm:max-w-[200px]"
                  >
                    {orgs.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>

                {activeOrg?.is_demo ? (
                  <span className="hidden sm:inline-flex px-2 py-0.5 text-[11px] rounded-full bg-amber-50/90 text-amber-700 border border-amber-200/80">
                    演示数据
                  </span>
                ) : (
                  <span className="hidden sm:inline-flex px-2 py-0.5 text-[11px] rounded-full bg-[#eff6ff]/90 text-[#1d4ed8] border border-[#bfdbfe]/80">
                    客户临时空间
                  </span>
                )}
              </div>

              {/* 全局磨砂搜索框（支持精确定位详情） */}
              <div className="relative hidden md:block flex-1 max-w-sm">
                <form onSubmit={handleGlobalSearch} className="relative">
                  <Search className="w-3.5 h-3.5 text-[#64748b] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      if (!e.target.value.trim()) setSearchResults(null);
                    }}
                    placeholder="全局搜索知识、产品、方案与内容..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-white/85 bg-white/75 focus:bg-white focus:outline-none focus:border-[#2563eb] shadow-2xs transition-colors"
                  />
                </form>
                {searchResults && (
                  <div className="absolute left-0 right-0 mt-1.5 bg-white/95 backdrop-blur-xl border border-white/90 rounded-xl shadow-xl p-3 z-40 text-xs space-y-1.5 max-h-80 overflow-y-auto">
                    <div className="flex justify-between items-center text-[11px] text-[#64748b]">
                      <span>精确命中结果</span>
                      <button onClick={() => setSearchResults(null)} className="hover:text-[#0f172a]">关闭</button>
                    </div>
                    {searchResults.knowledge.map((k, i) => (
                      <button
                        key={`k-${i}`}
                        onClick={() => { onTabChange('knowledge', k.documentId); setSearchResults(null); }}
                        className="w-full text-left p-1.5 rounded-lg hover:bg-[#f1f5f9] block"
                      >
                        <span className="text-[#1d4ed8] mr-1">[知识]</span>{k.title}
                      </button>
                    ))}
                    {searchResults.products.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => { onTabChange('products', p.id); setSearchResults(null); }}
                        className="w-full text-left p-1.5 rounded-lg hover:bg-[#f1f5f9] block"
                      >
                        <span className="text-emerald-700 mr-1">[产品]</span>{p.name}
                      </button>
                    ))}
                    {searchResults.campaigns.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => { onTabChange('campaigns', c.id); setSearchResults(null); }}
                        className="w-full text-left p-1.5 rounded-lg hover:bg-[#f1f5f9] block"
                      >
                        <span className="text-amber-700 mr-1">[方案]</span>{c.title}
                      </button>
                    ))}
                    {searchResults.creations.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => { onTabChange('creation', c.id); setSearchResults(null); }}
                        className="w-full text-left p-1.5 rounded-lg hover:bg-[#f1f5f9] block"
                      >
                        <span className="text-slate-700 mr-1">[内容]</span>{c.topic}
                      </button>
                    ))}
                    {searchResults.knowledge.length + searchResults.products.length + searchResults.campaigns.length + searchResults.creations.length === 0 && (
                      <div className="text-[#94a3b8] py-2 text-center">未命中相关业务记录</div>
                    )}
                  </div>
                )}
              </div>

              {/* 右侧：风光主题切换器、真实 Agent 状态、通知、创建企业 */}
              <div className="flex items-center gap-2 shrink-0">
                <div
                  role="group"
                  aria-label="切换工作台风光主题"
                  className="hidden xl:inline-flex items-center p-0.5 rounded-xl bg-white/70 border border-white/85 shadow-2xs"
                >
                  {WORKSPACE_SCENIC_THEMES.map((t) => {
                    const active = t.id === activeTheme.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setThemeId(t.id)}
                        title={`切换工作台背景：${t.fullLabel}`}
                        className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                          active
                            ? 'bg-[#1d4ed8] text-white shadow-2xs'
                            : 'text-[#475569] hover:text-[#0f172a]'
                        }`}
                      >
                        {t.shortLabel}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => onTabChange('agent')}
                  className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-white/85 bg-white/75 hover:bg-white text-xs text-[#0f172a] shadow-2xs transition-colors cursor-pointer"
                  title="查看真实 Agent 运行状态与执行历史"
                >
                  <span className={`w-2 h-2 rounded-full ${realAgentStatus?.isLiveModel ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <span>{realAgentStatus?.label || '读取状态中...'}</span>
                </button>

                <div className="relative">
                  <button
                    onClick={() => setShowNotif(!showNotif)}
                    className="p-1.5 rounded-xl border border-white/85 bg-white/75 text-[#334155] hover:bg-white relative shadow-2xs transition-colors cursor-pointer"
                    aria-label="消息通知"
                  >
                    <Bell className="w-4 h-4" />
                    {pendingReviewCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#dc2626] text-white text-[10px] flex items-center justify-center">
                        {pendingReviewCount}
                      </span>
                    )}
                  </button>
                  {showNotif && (
                    <div className="absolute right-0 mt-1.5 w-64 bg-white/95 backdrop-blur-xl border border-white/90 rounded-xl shadow-xl p-3 z-40 text-xs space-y-2">
                      <div className="font-semibold text-[#0f172a]">工作台提醒</div>
                      <div className="p-2 rounded-lg bg-[#f8fafc] text-[#475569]">
                        当前企业有 <strong>{pendingReviewCount}</strong> 项待审核内容。
                      </div>
                      <button
                        onClick={() => { setShowNotif(false); onTabChange('publish'); }}
                        className="w-full py-1.5 rounded-lg bg-[#eff6ff] text-[#1d4ed8] font-medium"
                      >
                        前往发布中心查看
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={onOpenOnboarding}
                  className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-[#1d4ed8]/90 hover:bg-[#1e40af] backdrop-blur-md border border-white/30 text-white text-xs font-medium shadow-xs transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">创建企业</span>
                </button>
              </div>
            </div>

            {/* 统一顶部毛玻璃面包屑栏 */}
            <nav aria-label="面包屑导航" className="px-4 lg:px-6 py-1.5 bg-white/45 border-t border-white/65 flex items-center justify-between text-[11px] text-[#475569]">
              <ol className="flex items-center gap-1 flex-wrap">
                <li>
                  <a
                    href={buildRouteHref('landing', activeOrgId)}
                    onClick={(e) => {
                      e.preventDefault();
                      onTabChange('landing');
                    }}
                    className="cursor-pointer px-1.5 py-0.5 rounded-md hover:bg-white/80 hover:text-[#1d4ed8] transition-colors inline-block"
                  >
                    体验首页
                  </a>
                </li>
                <li aria-hidden="true"><ChevronRight className="w-3 h-3 text-[#94a3b8]" /></li>
                <li>
                  <a
                    href={buildRouteHref(meta.groupTab, activeOrgId)}
                    onClick={(e) => {
                      e.preventDefault();
                      onTabChange(meta.groupTab);
                    }}
                    className={`cursor-pointer px-1.5 py-0.5 rounded-md transition-colors inline-block ${
                      activeTab === meta.groupTab
                        ? 'bg-white/90 text-[#1d4ed8] font-semibold shadow-2xs'
                        : 'hover:bg-white/80 hover:text-[#1d4ed8]'
                    }`}
                  >
                    {meta.group}
                  </a>
                </li>
                {activeTab !== meta.groupTab && (
                  <>
                    <li aria-hidden="true"><ChevronRight className="w-3 h-3 text-[#94a3b8]" /></li>
                    <li>
                      <span
                        aria-current="page"
                        className="px-2 py-0.5 rounded-md bg-white/90 text-[#1d4ed8] font-semibold inline-block shadow-2xs"
                      >
                        {meta.label}
                      </span>
                    </li>
                  </>
                )}
              </ol>
              <a
                href={buildRouteHref('agent', activeOrgId)}
                onClick={(e) => {
                  e.preventDefault();
                  onTabChange('agent');
                }}
                className="hidden sm:inline-block text-[11px] text-[#475569] hover:text-[#1d4ed8] cursor-pointer"
              >
                Agent 历史记录：{realAgentStatus?.stepCount ?? 0} 步
              </a>
            </nav>
          </header>

          {/* 移动端磨砂导航抽屉 */}
          {mobileOpen && (
            <div className="lg:hidden bg-white/90 backdrop-blur-xl border-b border-white/80 p-3 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#e2e8f0]/70">
                <span className="text-[11px] font-medium text-[#475569]">工作台风光主题</span>
                <div className="inline-flex items-center gap-1">
                  {WORKSPACE_SCENIC_THEMES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setThemeId(t.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium ${
                        t.id === activeTheme.id ? 'bg-[#1d4ed8] text-white' : 'bg-white/80 text-[#475569]'
                      }`}
                    >
                      {t.shortLabel}
                    </button>
                  ))}
                </div>
              </div>
              {NAV_GROUPS.map((g) => (
                <div key={g.group}>
                  <div className="text-[10px] font-semibold text-[#64748b] mb-1">{g.group}</div>
                  <div className="grid grid-cols-2 gap-1">
                    {g.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            onTabChange(item.id);
                            setMobileOpen(false);
                          }}
                          className={`flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs ${
                            activeTab === item.id
                              ? 'bg-[#1d4ed8] text-white font-medium'
                              : 'text-[#334155] hover:bg-white/75'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <main className="tg-workspace-glass flex-1 p-4 lg:p-6 max-w-[1440px] w-full mx-auto">
            {children}
          </main>

          {/* 底部符合业务流程的磨砂玻璃上一步 / 下一步导航条 */}
          {flowIdx >= 0 && (
            <footer className="border-t border-white/75 bg-white/68 backdrop-blur-xl px-4 lg:px-6 py-3 flex items-center justify-between text-xs">
              {prevTab ? (
                <button
                  onClick={() => onTabChange(prevTab)}
                  className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-white/85 bg-white/80 hover:bg-white text-[#334155] shadow-2xs transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>上一步：{findMeta(prevTab).label}</span>
                </button>
              ) : (
                <button
                  onClick={() => onTabChange('landing')}
                  className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-white/85 bg-white/80 hover:bg-white text-[#334155] shadow-2xs transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>返回体验首页</span>
                </button>
              )}
              {nextTab ? (
                <button
                  onClick={() => onTabChange(nextTab)}
                  className="inline-flex items-center gap-1 px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#1d4ed8] to-[#2563eb] hover:from-[#1e40af] hover:to-[#1d4ed8] text-white font-medium shadow-xs transition-all cursor-pointer"
                >
                  <span>下一步：{findMeta(nextTab).label}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={() => onTabChange('today')}
                  className="inline-flex items-center gap-1 px-4 py-1.5 rounded-xl bg-[#0f172a] text-white font-medium shadow-xs cursor-pointer"
                >
                  <span>完成闭环，回到今日工作台</span>
                </button>
              )}
            </footer>
          )}
        </div>
      </div>
    </WorkspaceThemeContext.Provider>
  );
}
