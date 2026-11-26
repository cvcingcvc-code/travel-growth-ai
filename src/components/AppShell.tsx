'use client';

import React, { useState } from 'react';
import {
  LayoutDashboard,
  Building2,
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
  RotateCcw,
} from 'lucide-react';

export type NavTab =
  | 'today'
  | 'brand_kb'
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

const NAV_ITEMS: Array<{ id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'today', label: '今日工作台', icon: LayoutDashboard },
  { id: 'brand_kb', label: '企业与品牌', icon: Building2 },
  { id: 'products', label: '产品管理', icon: Package },
  { id: 'agent', label: '专属 Agent', icon: Bot },
  { id: 'intelligence', label: '市场情报', icon: Radar },
  { id: 'campaigns', label: '营销方案', icon: Target },
  { id: 'creation', label: '内容生产', icon: PenTool },
  { id: 'publish', label: '发布中心', icon: Send },
  { id: 'review', label: '数据复盘', icon: BarChart3 },
  { id: 'settings', label: '系统设置', icon: Settings },
];

export function AppShell({
  activeTab,
  onTabChange,
  orgs,
  activeOrgId,
  onOrgChange,
  onOpenOnboarding,
  pendingReviewCount = 0,
  children,
}: {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  orgs: OrgItem[];
  activeOrgId: string;
  onOrgChange: (orgId: string) => void;
  onOpenOnboarding: () => void;
  pendingReviewCount?: number;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    knowledge: Array<{ title: string; category: string }>;
    products: Array<{ id: string; name: string }>;
    campaigns: Array<{ id: string; title: string }>;
    creations: Array<{ id: string; topic: string }>;
  } | null>(null);
  const [showNotif, setShowNotif] = useState(false);
  const [resetting, setResetting] = useState(false);

  const activeOrg = orgs.find((o) => o.id === activeOrgId);

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

  async function handleResetDemo() {
    setResetting(true);
    try {
      await fetch('/api/v1/demo/reset', { method: 'POST' });
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('tg_active_org');
        window.location.reload();
      }
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#f8fafc] text-[#0f172a]">
      {/* 左侧可折叠导航栏（Linear / 飞书浅灰白 + 深蓝激活态） */}
      <aside
        className={`hidden lg:flex lg:flex-col bg-white border-r border-[#e2e8f0] transition-all duration-200 shrink-0 ${
          collapsed ? 'w-[68px]' : 'w-60'
        }`}
      >
        <div className="h-14 px-3.5 border-b border-[#e2e8f0] flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-md bg-[#1d4ed8] text-white flex items-center justify-center font-semibold text-xs shrink-0">
                TG
              </div>
              <div className="truncate">
                <div className="font-semibold text-sm text-[#0f172a] leading-tight">TravelGrowth AI</div>
                <div className="text-[10px] text-[#64748b]">2.0 企业营销工作台</div>
              </div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-md text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a] mx-auto lg:mx-0"
            title={collapsed ? '展开导航' : '折叠导航'}
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        <nav className="flex-1 p-2.5 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] transition-colors ${
                  isActive
                    ? 'bg-[#eff6ff] text-[#1d4ed8] font-medium'
                    : 'text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a]'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#1d4ed8]' : 'text-[#64748b]'}`} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {!collapsed && (
          <div className="p-3 border-t border-[#e2e8f0] text-[11px] text-[#64748b] space-y-1">
            <div className="flex items-center justify-between">
              <span>多企业严格隔离</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <div>人工审核兜底 · 真实事实溯源</div>
          </div>
        )}
      </aside>

      {/* 右侧主区域 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 顶部工具栏：企业切换、全局搜索、消息通知、Agent 状态 */}
        <header className="h-14 bg-white border-b border-[#e2e8f0] px-4 lg:px-6 flex items-center justify-between gap-3 sticky top-0 z-20">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-1.5 rounded-md border border-[#e2e8f0] text-[#475569]"
              aria-label="打开菜单"
            >
              {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>

            <div className="flex items-center gap-1.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-md px-2.5 py-1">
              <Building2 className="w-3.5 h-3.5 text-[#1d4ed8] shrink-0" />
              <select
                value={activeOrgId}
                onChange={(e) => onOrgChange(e.target.value)}
                aria-label="切换企业工作空间"
                className="bg-transparent text-xs font-medium text-[#0f172a] focus:outline-none max-w-[160px] sm:max-w-[220px]"
              >
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>

            {activeOrg?.is_demo ? (
              <span className="hidden sm:inline-flex px-2 py-0.5 text-[11px] rounded bg-[#fef3c7] text-[#92400e] border border-[#fde68a]">
                演示数据
              </span>
            ) : (
              <span className="hidden sm:inline-flex px-2 py-0.5 text-[11px] rounded bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe]">
                正式空间
              </span>
            )}
          </div>

          {/* 全局搜索 */}
          <div className="relative hidden md:block flex-1 max-w-sm">
            <form onSubmit={handleGlobalSearch} className="relative">
              <Search className="w-3.5 h-3.5 text-[#94a3b8] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (!e.target.value.trim()) setSearchResults(null);
                }}
                placeholder="全局搜索知识库、产品、方案与内容..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-[#e2e8f0] bg-[#f8fafc] focus:bg-white focus:outline-none focus:border-[#2563eb]"
              />
            </form>
            {searchResults && (
              <div className="absolute left-0 right-0 mt-1 bg-white border border-[#e2e8f0] rounded-md shadow-lg p-3 z-40 text-xs space-y-2 max-h-80 overflow-y-auto">
                <div className="flex justify-between items-center text-[11px] text-[#64748b]">
                  <span>搜索结果</span>
                  <button onClick={() => setSearchResults(null)} className="hover:text-[#0f172a]">关闭</button>
                </div>
                {searchResults.knowledge.map((k, i) => (
                  <button
                    key={`k-${i}`}
                    onClick={() => { onTabChange('brand_kb'); setSearchResults(null); }}
                    className="w-full text-left p-1.5 rounded hover:bg-[#f1f5f9] block"
                  >
                    <span className="text-[#1d4ed8] mr-1">[知识]</span>{k.title}
                  </button>
                ))}
                {searchResults.products.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { onTabChange('products'); setSearchResults(null); }}
                    className="w-full text-left p-1.5 rounded hover:bg-[#f1f5f9] block"
                  >
                    <span className="text-emerald-700 mr-1">[产品]</span>{p.name}
                  </button>
                ))}
                {searchResults.campaigns.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { onTabChange('campaigns'); setSearchResults(null); }}
                    className="w-full text-left p-1.5 rounded hover:bg-[#f1f5f9] block"
                  >
                    <span className="text-amber-700 mr-1">[方案]</span>{c.title}
                  </button>
                ))}
                {searchResults.creations.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { onTabChange('creation'); setSearchResults(null); }}
                    className="w-full text-left p-1.5 rounded hover:bg-[#f1f5f9] block"
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

          {/* 右侧操作：Agent 状态、通知、重置演示、新企业入驻 */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onTabChange('agent')}
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[#e2e8f0] bg-[#f8fafc] hover:bg-[#eff6ff] text-xs text-[#0f172a]"
              title="查看专属营销 Agent 状态"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Agent 就绪</span>
            </button>

            <div className="relative">
              <button
                onClick={() => setShowNotif(!showNotif)}
                className="p-1.5 rounded-md border border-[#e2e8f0] text-[#475569] hover:bg-[#f1f5f9] relative"
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
                <div className="absolute right-0 mt-1.5 w-64 bg-white border border-[#e2e8f0] rounded-md shadow-lg p-3 z-40 text-xs space-y-2">
                  <div className="font-semibold text-[#0f172a]">工作台提醒</div>
                  <div className="p-2 rounded bg-[#f8fafc] text-[#475569]">
                    当前企业有 <strong>{pendingReviewCount}</strong> 项待人工审核内容，请前往发布中心或内容生产复核。
                  </div>
                  <button
                    onClick={() => { setShowNotif(false); onTabChange('publish'); }}
                    className="w-full py-1.5 rounded bg-[#eff6ff] text-[#1d4ed8] font-medium"
                  >
                    前往发布中心审核
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={handleResetDemo}
              disabled={resetting}
              title="重置演示数据"
              className="p-1.5 rounded-md border border-[#e2e8f0] text-[#64748b] hover:bg-[#f1f5f9]"
            >
              <RotateCcw className={`w-4 h-4 ${resetting ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={onOpenOnboarding}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">企业入驻</span>
            </button>
          </div>
        </header>

        {/* 移动端导航抽屉 */}
        {mobileOpen && (
          <div className="lg:hidden bg-white border-b border-[#e2e8f0] p-2.5 grid grid-cols-2 gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onTabChange(item.id);
                    setMobileOpen(false);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs ${
                    activeTab === item.id ? 'bg-[#eff6ff] text-[#1d4ed8] font-medium' : 'text-[#475569]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}

        <main className="flex-1 p-4 lg:p-6 max-w-[1440px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
