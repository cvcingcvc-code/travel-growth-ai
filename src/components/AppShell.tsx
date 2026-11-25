'use client';

import React, { useState } from 'react';
import {
  Compass,
  Radar,
  Sparkles,
  BookOpen,
  PenTool,
  Image as ImageIcon,
  Cpu,
  HelpCircle,
  Building2,
  Plus,
  Menu,
  X,
  ShieldCheck,
} from 'lucide-react';

export type NavTab =
  | 'today'
  | 'intelligence'
  | 'analysis'
  | 'knowledge'
  | 'creation'
  | 'assets'
  | 'models'
  | 'help';

export interface OrgItem {
  id: string;
  name: string;
  industry_type: string;
  location: string;
  is_demo: number;
}

const NAV_ITEMS: Array<{ id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'today', label: '今日工作台', icon: Compass },
  { id: 'intelligence', label: '市场情报中心', icon: Radar },
  { id: 'analysis', label: '爆款分析中心', icon: Sparkles },
  { id: 'knowledge', label: '企业知识库', icon: BookOpen },
  { id: 'creation', label: 'AI 内容创作', icon: PenTool },
  { id: 'assets', label: '素材与产品', icon: ImageIcon },
  { id: 'models', label: '模型配置中心', icon: Cpu },
  { id: 'help', label: '帮助与 Agent', icon: HelpCircle },
];

export function AppShell({
  activeTab,
  onTabChange,
  orgs,
  activeOrgId,
  onOrgChange,
  onCreateOrg,
  children,
}: {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  orgs: OrgItem[];
  activeOrgId: string;
  onOrgChange: (orgId: string) => void;
  onCreateOrg: (payload: { name: string; industryType: string; location: string; description: string }) => Promise<void>;
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [industryType, setIndustryType] = useState('homestay');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const activeOrg = orgs.find((o) => o.id === activeOrgId);

  async function handleSubmitOrg(e: React.FormEvent) {
    e.preventDefault();
    if (!orgName.trim()) return;
    setCreating(true);
    try {
      await onCreateOrg({ name: orgName, industryType, location, description });
      setOrgName('');
      setLocation('');
      setDescription('');
      setShowCreateModal(false);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#f5f2eb] text-[#1a2420]">
      {/* 左侧墨绿导航栏（桌面端） */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col bg-[#183a30] text-[#f5f2eb] border-r border-[#122c24] shrink-0">
        <div className="px-5 py-5 border-b border-[#254e42]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-[#b48446] text-[#fcfbf8] flex items-center justify-center font-semibold text-sm">
              TG
            </div>
            <div>
              <div className="font-semibold tracking-wide text-base">TravelGrowth AI</div>
              <div className="text-[11px] text-[#9eb5ab]">文旅内容营销智能工作台</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded text-sm transition-colors text-left ${
                  isActive
                    ? 'bg-[#265446] text-[#fcfbf8] font-medium border-l-2 border-[#c59b5f]'
                    : 'text-[#c9d6d0] hover:bg-[#1f473b] hover:text-[#fcfbf8]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#254e42] text-xs text-[#9eb5ab] space-y-1.5">
          <div className="flex items-center gap-1.5 text-[#d5e0db]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#c59b5f]" />
            <span>企业数据严格隔离</span>
          </div>
          <div>默认人工审核发布 · 真实性校验</div>
        </div>
      </aside>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 顶部栏 */}
        <header className="bg-[#fcfbf8] border-b border-[#dfd9cb] px-4 lg:px-6 py-3 flex items-center justify-between gap-3 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 rounded border border-[#dfd9cb] text-[#183a30]"
              aria-label="打开菜单"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-[#183a30] lg:hidden">TravelGrowth AI</span>
              <span className="hidden lg:inline text-[#53605a]">
                当前工作区：
                <strong className="text-[#1a2420] ml-1">{activeOrg?.name ?? '加载中...'}</strong>
              </span>
              {activeOrg?.is_demo ? (
                <span className="px-2 py-0.5 text-[11px] rounded bg-[#ebe6da] text-[#8a6534] border border-[#d8cfb8]">
                  演示企业数据
                </span>
              ) : (
                <span className="px-2 py-0.5 text-[11px] rounded bg-[#e3ede8] text-[#183a30] border border-[#c3d6cd]">
                  真实工作空间
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-[#f5f2eb] border border-[#dfd9cb] rounded px-2.5 py-1.5">
              <Building2 className="w-4 h-4 text-[#4c7364]" />
              <select
                value={activeOrgId}
                onChange={(e) => onOrgChange(e.target.value)}
                aria-label="切换企业工作空间"
                className="bg-transparent text-xs lg:text-sm text-[#1a2420] focus:outline-none max-w-[170px] lg:max-w-[240px]"
              >
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-[#183a30] hover:bg-[#214e41] text-[#fcfbf8] text-xs lg:text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">新建企业</span>
            </button>
          </div>
        </header>

        {/* 移动端抽屉导航 */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#183a30] text-[#f5f2eb] px-3 py-3 space-y-1 border-b border-[#254e42]">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onTabChange(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-sm ${
                    activeTab === item.id ? 'bg-[#265446] text-white' : 'text-[#c9d6d0]'
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

      {/* 新建企业工作空间弹窗 */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-[#fcfbf8] border border-[#dfd9cb] rounded-md w-full max-w-md p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-[#183a30]">创建新企业工作空间</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-[#7c8781] hover:text-[#1a2420]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmitOrg} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs text-[#53605a] mb-1">企业/景区/民宿名称 *</label>
                <input
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="例如：西湖山舍精品民宿"
                  className="w-full px-3 py-2 rounded border border-[#dfd9cb] bg-white focus:outline-none focus:border-[#183a30]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#53605a] mb-1">行业类型</label>
                  <select
                    value={industryType}
                    onChange={(e) => setIndustryType(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-[#dfd9cb] bg-white"
                  >
                    <option value="homestay">精品民宿/酒店</option>
                    <option value="scenic_spot">文旅景区/古镇</option>
                    <option value="travel_agency">旅游企业/定制游</option>
                    <option value="cultural_org">文化传播机构</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#53605a] mb-1">所在地</label>
                  <input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="如：浙江杭州"
                    className="w-full px-3 py-2 rounded border border-[#dfd9cb] bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-[#53605a] mb-1">企业定位简述</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="简述核心特色、客群与文旅资源..."
                  className="w-full px-3 py-2 rounded border border-[#dfd9cb] bg-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-1.5 rounded border border-[#dfd9cb] text-[#53605a]"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-1.5 rounded bg-[#183a30] text-white font-medium disabled:opacity-60"
                >
                  {creating ? '创建中...' : '确认创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
