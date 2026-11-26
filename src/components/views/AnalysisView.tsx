'use client';

import React, { useEffect, useState } from 'react';
import { BookmarkCheck, Sparkles, ShieldAlert } from 'lucide-react';

interface CaseAnalysis {
  id: string;
  title_hook: string;
  target_audience: string;
  user_pain_points: string;
  content_structure: string;
  emotional_value: string;
  visual_style: string;
  product_selling_points: string;
  conversion_method: string;
  reusable_strategy: string;
  org_fit_score: number;
  org_fit_reason: string;
  evidence_source: string;
  credibility_level: string;
  data_origin: string;
}

interface ContentCase {
  id: string;
  platform: string;
  title: string;
  author_handle: string;
  source_url: string;
  raw_text: string;
  metrics_verified: number;
  is_demo: number;
  latestAnalysis: CaseAnalysis | null;
}

interface StrategyCard {
  id: string;
  title: string;
  target_platform: string;
  hook_pattern: string;
  structure_template: string;
  conversion_cta: string;
}

export function AnalysisView({ orgId }: { orgId: string }) {
  const [cases, setCases] = useState<ContentCase[]>([]);
  const [strategies, setStrategies] = useState<StrategyCard[]>([]);
  const [title, setTitle] = useState('');
  const [platform, setPlatform] = useState('xiaohongshu');
  const [sourceUrl, setSourceUrl] = useState('');
  const [rawText, setRawText] = useState('');
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  async function loadAll() {
    const [cRes, sRes] = await Promise.all([
      fetch('/api/v1/cases', { headers: { 'x-organization-id': orgId } }),
      fetch('/api/v1/strategies', { headers: { 'x-organization-id': orgId } }),
    ]);
    const cJson = await cRes.json();
    const sJson = await sRes.json();
    if (cJson.ok) setCases(cJson.data);
    if (sJson.ok) setStrategies(sJson.data);
  }

  useEffect(() => {
    loadAll();
  }, [orgId]);

  async function handleCreateCase(e: React.FormEvent) {
    e.preventDefault();
    setNotice('');
    const res = await fetch('/api/v1/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-organization-id': orgId },
      body: JSON.stringify({ title, platform, sourceUrl, rawText }),
    });
    const json = await res.json();
    if (json.ok) {
      setTitle('');
      setSourceUrl('');
      setRawText('');
      setNotice('市场案例已录入（已标注未接入实时平台指标）。');
      await loadAll();
    } else {
      setNotice(json.error?.message || '录入失败');
    }
  }

  async function handleAnalyze(caseId: string) {
    setAnalyzingId(caseId);
    setNotice('');
    try {
      const res = await fetch(`/api/v1/cases/${caseId}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-organization-id': orgId },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (json.ok) {
        setNotice(`11维结构化分析完成（数据来源标记：${json.data.data_origin}）`);
        await loadAll();
      } else {
        setNotice(`${json.error?.message} ${json.error?.guidance || ''}`);
      }
    } finally {
      setAnalyzingId(null);
    }
  }

  async function handleSaveStrategy(c: ContentCase) {
    if (!c.latestAnalysis) return;
    const res = await fetch('/api/v1/strategies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-organization-id': orgId },
      body: JSON.stringify({
        caseAnalysisId: c.latestAnalysis.id,
        title: `策略卡：${c.title.slice(0, 22)}`,
        targetPlatform: c.platform,
        targetAudience: c.latestAnalysis.target_audience,
        hookPattern: c.latestAnalysis.title_hook,
        structureTemplate: c.latestAnalysis.content_structure,
        conversionCta: c.latestAnalysis.conversion_method,
        applicableScenarios: c.latestAnalysis.reusable_strategy,
      }),
    });
    const json = await res.json();
    if (json.ok) {
      setNotice('已保存为企业营销策略卡片！可在「AI 内容创作」中直接引用。');
      await loadAll();
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#183a30]">爆款分析中心</h1>
        <p className="text-xs text-[#53605a] mt-0.5">
          将原始案例转化为 11 维结构化分析，严禁捏造热度指标，支持一键沉淀为企业营销策略卡片。
        </p>
      </div>

      {notice && (
        <div className="p-3 rounded bg-[#ebe6da] border border-[#d8cfb8] text-xs text-[#183a30] flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 录入案例 + 已保存策略卡 */}
        <div className="space-y-5">
          <form onSubmit={handleCreateCase} className="bg-[#fcfbf8] border border-[#dfd9cb] rounded p-4 space-y-3">
            <h2 className="text-sm font-semibold text-[#183a30]">导入有来源的市场案例</h2>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="案例标题 *"
              className="w-full px-3 py-2 text-sm rounded border border-[#dfd9cb] bg-white"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="px-2.5 py-2 text-xs rounded border border-[#dfd9cb] bg-white"
              >
                <option value="xiaohongshu">小红书</option>
                <option value="douyin">抖音</option>
                <option value="wechat">微信公众号</option>
              </select>
              <input
                required
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="案例来源链接 *"
                className="px-2.5 py-2 text-xs rounded border border-[#dfd9cb] bg-white"
              />
            </div>
            <textarea
              required
              rows={4}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="粘贴案例原文（系统将作为不可信外部文本隔离处理）..."
              className="w-full px-3 py-2 text-sm rounded border border-[#dfd9cb] bg-white"
            />
            <button
              type="submit"
              className="w-full py-2 rounded bg-[#183a30] hover:bg-[#214e41] text-white text-sm font-medium"
            >
              保存市场案例
            </button>
          </form>

          <div className="bg-[#fcfbf8] border border-[#dfd9cb] rounded p-4 space-y-2.5">
            <h2 className="text-sm font-semibold text-[#183a30] flex items-center gap-1.5">
              <BookmarkCheck className="w-4 h-4 text-[#4c7364]" />
              已沉淀营销策略卡片 ({strategies.length})
            </h2>
            {strategies.map((s) => (
              <div key={s.id} className="p-2.5 rounded bg-[#f5f2eb] border border-[#e5dfd2] text-xs space-y-1">
                <div className="font-medium text-[#183a30]">{s.title}</div>
                <div className="text-[#53605a] text-[11px]">钩子：{s.hook_pattern}</div>
                <div className="text-[#7c8781] text-[11px]">结构：{s.structure_template}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 右侧案例与 11 维拆解详情 */}
        <div className="lg:col-span-2 space-y-4">
          {cases.length === 0 ? (
            <div className="bg-[#fcfbf8] border border-[#dfd9cb] rounded p-8 text-center text-xs text-[#7c8781]">
              当前企业暂无市场案例，请在左侧录入。
            </div>
          ) : (
            cases.map((c) => (
              <div key={c.id} className="bg-[#fcfbf8] border border-[#dfd9cb] rounded p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#ebe6da] pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-[10px] rounded bg-[#ebe6da] text-[#183a30]">{c.platform}</span>
                      {c.is_demo ? <span className="text-[10px] text-[#b48446]">演示案例</span> : null}
                      <h3 className="text-sm font-semibold text-[#1a2420]">{c.title}</h3>
                    </div>
                    <div className="text-[11px] text-[#7c8781] mt-1">来源：{c.source_url || '手动录入'}</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAnalyze(c.id)}
                      disabled={analyzingId === c.id}
                      className="px-3 py-1.5 rounded bg-[#183a30] text-white text-xs inline-flex items-center gap-1 disabled:opacity-60"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {analyzingId === c.id ? '分析中...' : c.latestAnalysis ? '重新拆解' : '执行 11 维拆解'}
                    </button>
                    {c.latestAnalysis && (
                      <button
                        onClick={() => handleSaveStrategy(c)}
                        className="px-3 py-1.5 rounded border border-[#183a30] text-[#183a30] text-xs hover:bg-[#ebe6da]"
                      >
                        存为策略卡片
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-[#53605a] bg-[#f5f2eb] p-2.5 rounded">{c.raw_text}</p>

                {c.latestAnalysis && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs pt-1">
                    {[
                      ['标题钩子', c.latestAnalysis.title_hook],
                      ['目标客群', c.latestAnalysis.target_audience],
                      ['用户痛点', c.latestAnalysis.user_pain_points],
                      ['内容结构', c.latestAnalysis.content_structure],
                      ['情绪价值', c.latestAnalysis.emotional_value],
                      ['视觉风格', c.latestAnalysis.visual_style],
                      ['产品卖点', c.latestAnalysis.product_selling_points],
                      ['转化方式', c.latestAnalysis.conversion_method],
                      ['可复用策略', c.latestAnalysis.reusable_strategy],
                      [`企业匹配度 (${c.latestAnalysis.org_fit_score}分)`, c.latestAnalysis.org_fit_reason],
                    ].map(([k, v]) => (
                      <div key={k} className="p-2.5 rounded border border-[#e5dfd2] bg-white">
                        <div className="text-[11px] font-semibold text-[#183a30]">{k}</div>
                        <div className="text-[#53605a] mt-0.5 leading-relaxed">{v}</div>
                      </div>
                    ))}
                    <div className="md:col-span-2 p-2 rounded bg-[#ebe6da] text-[11px] text-[#53605a] flex justify-between">
                      <span>证据来源：{c.latestAnalysis.evidence_source}</span>
                      <span>可信度：{c.latestAnalysis.credibility_level} · 模式：{c.latestAnalysis.data_origin === 'external_agent' ? 'Codex 证据分析' : c.latestAnalysis.data_origin}</span>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
