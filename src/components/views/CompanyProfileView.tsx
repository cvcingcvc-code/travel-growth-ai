'use client';

import React, { useEffect, useState } from 'react';
import { Building2, Download, ShieldCheck, ArrowRight } from 'lucide-react';
import type { NavTab } from '../AppShell';

export function CompanyProfileView({
  orgId,
  onNavigate,
}: {
  orgId: string;
  onNavigate: (tab: NavTab) => void;
}) {
  const [profile, setProfile] = useState<{
    organization: { id: string; name: string; industry_type: string; location: string; description: string; is_demo: number; created_at: string };
    brandProfile: { positioning: string; target_audiences_json: string; tone_keywords_json: string; visual_guidelines: string; forbidden_claims_json: string; verified_facts_note: string } | null;
    products: Array<{ id: string; name: string; price_info: string; verification_status: string }>;
  } | null>(null);

  useEffect(() => {
    fetch(`/api/v1/organizations?organizationId=${encodeURIComponent(orgId)}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setProfile(j.data);
      });
  }, [orgId]);

  if (!profile) {
    return <div className="p-8 text-center text-xs text-[#64748b] bg-white border border-[#e2e8f0] rounded-lg">正在加载企业档案...</div>;
  }

  const org = profile.organization;
  const brand = profile.brandProfile;
  const audiences: string[] = JSON.parse(brand?.target_audiences_json || '[]');
  const tones: string[] = JSON.parse(brand?.tone_keywords_json || '[]');
  const forbidden: string[] = JSON.parse(brand?.forbidden_claims_json || '[]');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[#0f172a] flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#1d4ed8]" /> 企业档案与品牌规范
          </h1>
          <p className="text-xs text-[#64748b] mt-0.5">
            所有知识检索、专属 Agent 与内容生产均以本页企业事实与宣传红线为依据。
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={`/api/v1/export?organizationId=${encodeURIComponent(orgId)}`}
            download
            className="px-3 py-1.5 rounded-md border border-[#e2e8f0] bg-white hover:bg-[#f8fafc] text-xs font-medium text-[#0f172a] inline-flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-[#1d4ed8]" /> 导出企业数据 JSON
          </a>
          <button
            onClick={() => onNavigate('knowledge')}
            className="px-3.5 py-1.5 rounded-md bg-[#1d4ed8] text-white text-xs font-medium inline-flex items-center gap-1"
          >
            进入企业知识库 <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-xs">
        <section className="bg-white border border-[#e2e8f0] rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-2">
            <h2 className="text-sm font-semibold text-[#0f172a]">企业基本资料</h2>
            <span className={`px-2 py-0.5 rounded text-[11px] ${org.is_demo ? 'bg-amber-50 text-amber-700' : 'bg-[#eff6ff] text-[#1d4ed8]'}`}>
              {org.is_demo ? '预置演示企业' : '客户独立企业'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-[#475569]">
            <div><strong className="text-[#0f172a]">企业名称：</strong>{org.name}</div>
            <div><strong className="text-[#0f172a]">行业类型：</strong>{org.industry_type}</div>
            <div><strong className="text-[#0f172a]">所在地：</strong>{org.location || '[待补充]'}</div>
            <div><strong className="text-[#0f172a]">工作空间 ID：</strong><code>{org.id}</code></div>
          </div>
          <div className="p-3 rounded bg-[#f8fafc] border border-[#e2e8f0] text-[#475569] leading-relaxed">
            {org.description || '尚未填写企业简介。'}
          </div>
        </section>

        <section className="bg-white border border-[#e2e8f0] rounded-lg p-5 space-y-3">
          <h2 className="text-sm font-semibold text-[#0f172a] border-b border-[#e2e8f0] pb-2 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#1d4ed8]" /> 品牌定位与宣传禁区
          </h2>
          <div><strong className="text-[#0f172a]">品牌定位：</strong><span className="text-[#475569]">{brand?.positioning || '[待补充]'}</span></div>
          <div><strong className="text-[#0f172a]">视觉规范：</strong><span className="text-[#475569]">{brand?.visual_guidelines || '[待补充]'}</span></div>
          <div>
            <strong className="text-[#0f172a]">目标客群：</strong>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {audiences.length === 0 ? <span className="text-[#94a3b8]">[待补充]</span> : audiences.map((a, i) => <span key={i} className="px-2 py-0.5 rounded bg-[#eff6ff] text-[#1d4ed8]">{a}</span>)}
            </div>
          </div>
          <div>
            <strong className="text-[#0f172a]">调性关键词：</strong>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {tones.length === 0 ? <span className="text-[#94a3b8]">[待补充]</span> : tones.map((t, i) => <span key={i} className="px-2 py-0.5 rounded bg-[#f1f5f9] text-[#334155]">{t}</span>)}
            </div>
          </div>
          <div>
            <strong className="text-[#0f172a]">宣传禁区与红线：</strong>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {forbidden.length === 0 ? <span className="text-[#94a3b8]">未设置</span> : forbidden.map((f, i) => <span key={i} className="px-2 py-0.5 rounded bg-red-50 text-red-700">{f}</span>)}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
