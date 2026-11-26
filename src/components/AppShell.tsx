'use client';

import React, { useState } from 'react';
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

function findMeta(tab: NavTab) {
  for (const g of NAV_GROUPS) {
    const found = g.items.find((i) => i.id === tab);
    if (found) return { group: g.group, label: found.label };
  }
  return { group: '工作台', label: '首页' };
}

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
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#f8fafc] text-[#0f172a]">
      {/* 固定左侧 4 分组导航栏 */}
      <aside
        className={`hidden lg:flex lg:flex-col bg-white border-r border-[#e2e8f0] transition-all duration-200 shrink-0 sticky top-0 h-screen ${
          collapsed ? 'w-[68px]' : 'w-60'
        }`}
      >
        <div className="h-14 px-3.5 border-b border-[#e2e8f0] flex items-center justify-between">
          {!collapsed && (
            <button
              onClick={() => onTabChange('landing')}
              className="flex items-center gap-2 min-w-0 text-left hover:opacity-85"
              title="返回客户体验首页"
            >
              <div className="w-7 h-7 rounded-md bg-[#1d4ed8] text-white flex items-center justify-center font-semibold text-xs shrink-0">
                TG
              </div>
              <div className="truncate">
                <div className="font-semibold text-sm text-[#0f172a] leading-tight">TravelGrowth AI</div>
                <div className="text-[10px] text-[#64748b]">返回体验首页</div>
              </div>
            </button>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-md text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a] mx-auto lg:mx-0"
            title={collapsed ? '展开导航' : '折叠导航'}
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        <nav className="flex-1 p-2.5 space-y-4 overflow-y-auto">
          {NAV_GROUPS.map((g) => (
            <div key={g.group} className="space-y-0.5">
              {!collapsed && (
                <div className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#94a3b8]">
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
            </div>
          ))}
        </nav>

        {!collapsed && (
          <div className="p-3 border-t border-[#e2e8f0] text-[11px] text-[#64748b] space-y-1.5">
            <a
              href={`/api/v1/export?organizationId=${encodeURIComponent(activeOrgId)}`}
              download
              className="w-full py-1.5 px-2.5 rounded-md border border-[#e2e8f0] bg-[#f8fafc] hover:bg-[#eff6ff] text-[#0f172a] inline-flex items-center justify-center gap-1.5 font-medium"
            >
              <Download className="w-3.5 h-3.5 text-[#1d4ed8]" /> 导出企业数据备份
            </a>
            <div className="text-[10px] text-[#94a3b8] text-center">数据按企业严格隔离</div>
          </div>
        )}
      </aside>

      {/* 右侧主区域 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 顶部工具栏 */}
        <header className="bg-white border-b border-[#e2e8f0] sticky top-0 z-20">
          <div className="h-14 px-4 lg:px-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden p-1.5 rounded-md border border-[#e2e8f0] text-[#475569]"
                aria-label="打开菜单"
              >
                {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>

              <button
                onClick={onGoBack}
                className="p-1.5 rounded-md border border-[#e2e8f0] text-[#475569] hover:bg-[#f1f5f9]"
                title="返回上一级"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-1.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-md px-2.5 py-1">
                <Building2 className="w-3.5 h-3.5 text-[#1d4ed8] shrink-0" />
                <select
                  value={activeOrgId}
                  onChange={(e) => onOrgChange(e.target.value)}
                  aria-label="切换企业工作空间"
                  className="bg-transparent text-xs font-medium text-[#0f172a] focus:outline-none max-w-[150px] sm:max-w-[210px]"
                >
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>

              {activeOrg?.is_demo ? (
                <span className="hidden sm:inline-flex px-2 py-0.5 text-[11px] rounded bg-amber-50 text-amber-700 border border-amber-200">
                  演示数据
                </span>
              ) : (
                <span className="hidden sm:inline-flex px-2 py-0.5 text-[11px] rounded bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe]">
                  客户临时空间
                </span>
              )}
            </div>

            {/* 全局搜索（支持精确定位详情） */}
            <div className="relative hidden md:block flex-1 max-w-sm">
              <form onSubmit={handleGlobalSearch} className="relative">
                <Search className="w-3.5 h-3.5 text-[#94a3b8] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (!e.target.value.trim()) setSearchResults(null);
                  }}
                  placeholder="全局搜索知识、产品、方案与内容..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-[#e2e8f0] bg-[#f8fafc] focus:bg-white focus:outline-none focus:border-[#2563eb]"
                />
              </form>
              {searchResults && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-[#e2e8f0] rounded-md shadow-lg p-3 z-40 text-xs space-y-1.5 max-h-80 overflow-y-auto">
                  <div className="flex justify-between items-center text-[11px] text-[#64748b]">
                    <span>精确命中结果</span>
                    <button onClick={() => setSearchResults(null)} className="hover:text-[#0f172a]">关闭</button>
                  </div>
                  {searchResults.knowledge.map((k, i) => (
                    <button
                      key={`k-${i}`}
                      onClick={() => { onTabChange('knowledge', k.documentId); setSearchResults(null); }}
                      className="w-full text-left p-1.5 rounded hover:bg-[#f1f5f9] block"
                    >
                      <span className="text-[#1d4ed8] mr-1">[知识]</span>{k.title}
                    </button>
                  ))}
                  {searchResults.products.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { onTabChange('products', p.id); setSearchResults(null); }}
                      className="w-full text-left p-1.5 rounded hover:bg-[#f1f5f9] block"
                    >
                      <span className="text-emerald-700 mr-1">[产品]</span>{p.name}
                    </button>
                  ))}
                  {searchResults.campaigns.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => { onTabChange('campaigns', c.id); setSearchResults(null); }}
                      className="w-full text-left p-1.5 rounded hover:bg-[#f1f5f9] block"
                    >
                      <span className="text-amber-700 mr-1">[方案]</span>{c.title}
                    </button>
                  ))}
                  {searchResults.creations.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => { onTabChange('creation', c.id); setSearchResults(null); }}
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

            {/* 右侧：真实 Agent 状态、通知、创建企业 */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => onTabChange('agent')}
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[#e2e8f0] bg-[#f8fafc] hover:bg-[#eff6ff] text-xs text-[#0f172a]"
                title="查看真实 Agent 运行状态与执行历史"
              >
                <span className={`w-2 h-2 rounded-full ${realAgentStatus?.isLiveModel ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <span>{realAgentStatus?.label || '读取状态中...'}</span>
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
                      当前企业有 <strong>{pendingReviewCount}</strong> 项待审核内容。
                    </div>
                    <button
                      onClick={() => { setShowNotif(false); onTabChange('publish'); }}
                      className="w-full py-1.5 rounded bg-[#eff6ff] text-[#1d4ed8] font-medium"
                    >
                      前往发布中心查看
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={onOpenOnboarding}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">创建企业</span>
              </button>
            </div>
          </div>

          {/* 统一顶部面包屑栏 */}
          <div className="px-4 lg:px-6 py-1.5 bg-[#f8fafc] border-t border-[#e2e8f0] flex items-center justify-between text-[11px] text-[#64748b]">
            <div className="flex items-center gap-1.5">
              <button onClick={() => onTabChange('landing')} className="hover:text-[#1d4ed8]">体验首页</button>
              <ChevronRight className="w-3 h-3" />
              <span>{meta.group}</span>
              <ChevronRight className="w-3 h-3" />
              <span className="font-medium text-[#0f172a]">{meta.label}</span>
            </div>
            <div className="hidden sm:block text-[11px] text-[#94a3b8]">
              Agent 历史记录：{realAgentStatus?.stepCount ?? 0} 步
            </div>
          </div>
        </header>

        {/* 移动端导航抽屉 */}
        {mobileOpen && (
          <div className="lg:hidden bg-white border-b border-[#e2e8f0] p-3 space-y-3">
            {NAV_GROUPS.map((g) => (
              <div key={g.group}>
                <div className="text-[10px] font-semibold text-[#94a3b8] mb-1">{g.group}</div>
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
                        className={`flex items-center gap-2 px-2.5 py-2 rounded-md text-xs ${
                          activeTab === item.id ? 'bg-[#eff6ff] text-[#1d4ed8] font-medium' : 'text-[#475569]'
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

        <main className="flex-1 p-4 lg:p-6 max-w-[1440px] w-full mx-auto">{children}</main>

        {/* 底部符合业务流程的上一步 / 下一步导航条 */}
        {flowIdx >= 0 && (
          <footer className="border-t border-[#e2e8f0] bg-white px-4 lg:px-6 py-3 flex items-center justify-between text-xs">
            {prevTab ? (
              <button
                onClick={() => onTabChange(prevTab)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-[#e2e8f0] hover:bg-[#f8fafc] text-[#475569]"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>上一步：{findMeta(prevTab).label}</span>
              </button>
            ) : (
              <button
                onClick={() => onTabChange('landing')}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-[#e2e8f0] hover:bg-[#f8fafc] text-[#475569]"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>返回体验首页</span>
              </button>
            )}
            {nextTab ? (
              <button
                onClick={() => onTabChange(nextTab)}
                className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-md bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-medium"
              >
                <span>下一步：{findMeta(nextTab).label}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={() => onTabChange('today')}
                className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-md bg-[#0f172a] text-white font-medium"
              >
                <span>完成闭环，回到今日工作台</span>
              </button>
            )}
          </footer>
        )}
      </div>
    </div>
  );
}
