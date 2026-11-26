'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, Sparkles, Target, ArrowRight, AlertTriangle } from 'lucide-react';
import type { NavTab } from '../AppShell';

interface Campaign {
  id: string;
  product_id: string | null;
  version_number: number;
  title: string;
  marketing_goal: string;
  target_audience_needs: string;
  differentiated_selling_points: string;
  topic_pool_json: string;
  platform_strategy_json: string;
  plan_7d_json: string;
  plan_30d_json: string;
  visual_direction: string;
  video_direction: string;
  conversion_guide: string;
  required_assets_and_unverified_json: string;
  approval_status: string;
  data_origin: string;
  updated_at: string;
}

export function CampaignsView({ orgId, onNavigate }: { orgId: string; onNavigate: (tab: NavTab) => void }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [products, setProducts] = useState<Array<{ id: string; name: string }>>([]);
  const [productId, setProductId] = useState('');
  const [goal, setGoal] = useState('提升小红书收藏率与有效咨询率，建立首周转化基线');
  const [generating, setGenerating] = useState(false);
  const [notice, setNotice] = useState('');

  async function loadAll() {
    const [cRes, pRes] = await Promise.all([
      fetch('/api/v1/campaigns', { headers: { 'x-organization-id': orgId } }),
      fetch('/api/v1/products', { headers: { 'x-organization-id': orgId } }),
    ]);
    const cJson = await cRes.json();
    const pJson = await pRes.json();
    if (cJson.ok) setCampaigns(cJson.data);
    if (pJson.ok) {
      setProducts(pJson.data);
      if (pJson.data[0] && !productId) setProductId(pJson.data[0].id);
    }
  }

  useEffect(() => {
    loadAll();
  }, [orgId]);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);
    setNotice('');
    try {
      const res = await fetch('/api/v1/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-organization-id': orgId },
        body: JSON.stringify({ productId, marketingGoal: goal }),
      });
      const json = await res.json();
      if (json.ok) {
        setNotice(`已生成完整营销方案「${json.data.title}」（含 7 天/30 天计划与待核实清单）。`);
        await loadAll();
      } else {
        setNotice(json.error?.message || '生成失败');
      }
    } finally {
      setGenerating(false);
    }
  }

  async function handleApprove(c: Campaign) {
    const res = await fetch('/api/v1/campaigns', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-organization-id': orgId },
      body: JSON.stringify({ campaignId: c.id, approvalStatus: 'approved' }),
    });
    if (res.ok) {
      setNotice(`方案「${c.title}」已审批通过（v${c.version_number + 1}），可直接用于内容生产。`);
      await loadAll();
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#0f172a] flex items-center gap-2">
          <Target className="w-5 h-5 text-[#1d4ed8]" /> 自动营销方案中心
        </h1>
        <p className="text-xs text-[#64748b] mt-0.5">
          结合企业知识库、目标产品与同行爆款分析，生成可审批、可迭代的 7 天/30 天完整营销方案。
        </p>
      </div>

      {notice && <div className="p-3 rounded-md bg-[#eff6ff] border border-[#bfdbfe] text-xs text-[#1e40af]">{notice}</div>}

      <form onSubmit={handleGenerate} className="bg-white border border-[#e2e8f0] rounded-lg p-4 grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
        <select
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          className="md:col-span-3 px-3 py-2 rounded-md border border-[#e2e8f0] bg-white"
        >
          {products.length === 0 && <option value="">通用企业方案</option>}
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <input
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="营销目标（如：提升小红书收藏率与私信咨询）"
          className="md:col-span-6 px-3 py-2 rounded-md border border-[#e2e8f0] bg-[#f8fafc] focus:bg-white"
        />
        <button
          type="submit"
          disabled={generating}
          className="md:col-span-3 px-4 py-2 rounded-md bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-medium inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {generating ? '策划 Agent 生成中...' : '生成完整营销方案'}
        </button>
      </form>

      {campaigns.length === 0 ? (
        <div className="bg-white border border-[#e2e8f0] rounded-lg p-10 text-center text-xs text-[#64748b]">
          当前企业尚未生成营销方案，请在上方选择产品与目标后点击「生成完整营销方案」。
        </div>
      ) : (
        <div className="space-y-5">
          {campaigns.map((c) => {
            const topics: string[] = JSON.parse(c.topic_pool_json || '[]');
            const plan7d: Array<{ day: string; topic: string; platform: string; goal: string }> = JSON.parse(c.plan_7d_json || '[]');
            const plan30d: Array<{ week: string; focus: string; deliverable: string }> = JSON.parse(c.plan_30d_json || '[]');
            const unverified: string[] = JSON.parse(c.required_assets_and_unverified_json || '[]');

            return (
              <div key={c.id} className="bg-white border border-[#e2e8f0] rounded-lg p-5 space-y-4 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e2e8f0] pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-semibold text-[#0f172a]">{c.title}</h2>
                      <span className="px-2 py-0.5 rounded bg-[#f1f5f9] text-[#475569] text-[10px]">v{c.version_number}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] ${c.approval_status === 'approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {c.approval_status === 'approved' ? '已审批' : '待审批'}
                      </span>
                    </div>
                    <div className="text-[#64748b] mt-1">营销目标：{c.marketing_goal}</div>
                  </div>
                  <div className="flex gap-2">
                    {c.approval_status !== 'approved' && (
                      <button onClick={() => handleApprove(c)} className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> 审批通过
                      </button>
                    )}
                    <button onClick={() => onNavigate('creation')} className="px-3 py-1.5 rounded bg-[#eff6ff] text-[#1d4ed8] font-medium inline-flex items-center gap-1">
                      去内容生产 <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {unverified.length > 0 && (
                  <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-amber-800 space-y-1">
                    <div className="font-semibold flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> 所需素材与待核实事实提醒</div>
                    {unverified.map((u, i) => <div key={i}>• {u}</div>)}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 rounded bg-[#f8fafc] border border-[#e2e8f0]">
                    <div className="font-semibold text-[#0f172a] mb-1">目标用户与需求</div>
                    <div className="text-[#475569] leading-relaxed">{c.target_audience_needs}</div>
                  </div>
                  <div className="p-3 rounded bg-[#f8fafc] border border-[#e2e8f0]">
                    <div className="font-semibold text-[#0f172a] mb-1">差异化产品卖点</div>
                    <div className="text-[#475569] leading-relaxed">{c.differentiated_selling_points}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <div className="font-semibold text-[#0f172a] mb-2">7 天落地排期</div>
                    <div className="space-y-1.5">
                      {plan7d.map((p, i) => (
                        <div key={i} className="p-2 rounded bg-[#f8fafc] border border-[#e2e8f0] flex justify-between gap-2">
                          <span><strong>{p.day}</strong> · {p.topic}</span>
                          <span className="text-[#1d4ed8] shrink-0">{p.platform} ({p.goal})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold text-[#0f172a] mb-2">30 天阶段规划</div>
                    <div className="space-y-1.5">
                      {plan30d.map((p, i) => (
                        <div key={i} className="p-2 rounded bg-[#f8fafc] border border-[#e2e8f0]">
                          <strong>{p.week} · {p.focus}</strong>：{p.deliverable}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-[#e2e8f0] text-[11px] text-[#475569]">
                  <div><strong className="text-[#0f172a]">视觉设计方向：</strong>{c.visual_direction}</div>
                  <div><strong className="text-[#0f172a]">短视频方向：</strong>{c.video_direction}</div>
                  <div><strong className="text-[#0f172a]">转化引导方式：</strong>{c.conversion_guide}</div>
                </div>

                {topics.length > 0 && (
                  <div className="pt-2 border-t border-[#e2e8f0]">
                    <div className="font-semibold text-[#0f172a] mb-1.5">推荐选题库</div>
                    <div className="flex flex-wrap gap-1.5">
                      {topics.map((t, i) => (
                        <span key={i} className="px-2.5 py-1 rounded bg-[#f1f5f9] text-[#334155]">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
