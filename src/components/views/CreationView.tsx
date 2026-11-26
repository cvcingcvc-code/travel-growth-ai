'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy, FileText, Save, Sparkles, AlertTriangle } from 'lucide-react';

interface ProductItem {
  id: string;
  name: string;
  verification_status: string;
}

interface StrategyItem {
  id: string;
  title: string;
}

interface ContentVersion {
  id: string;
  version_number: number;
  titles_json: string;
  selected_title: string;
  body_copy: string;
  cover_design_note: string;
  carousel_plan_json: string;
  image_prompts_json: string;
  hashtags_json: string;
  conversion_cta: string;
  knowledge_citations_json: string;
  risk_check_json: string;
  data_origin: string;
  created_at: string;
}

interface ContentProject {
  id: string;
  topic: string;
  target_platform: string;
  review_status: string;
  versions: ContentVersion[];
}

export function CreationView({ orgId }: { orgId: string }) {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [strategies, setStrategies] = useState<StrategyItem[]>([]);
  const [projects, setProjects] = useState<ContentProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const selection = useRef('');
  const loadSequence = useRef(0);

  const [productId, setProductId] = useState('');
  const [strategyId, setStrategyId] = useState('');
  const [platform, setPlatform] = useState('xiaohongshu');
  const [audience, setAudience] = useState('江浙沪周末短途度假客群');
  const [goal, setGoal] = useState('种草引流与咨询转化');
  const [style, setStyle] = useState('松弛感自然叙事');
  const [topic, setTopic] = useState('');
  const [topicIdeas, setTopicIdeas] = useState<Array<{ topic: string; angle: string }>>([]);

  // 编辑态
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editCover, setEditCover] = useState('');
  const [editCta, setEditCta] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState('');

  async function loadAll() {
    const sequence = ++loadSequence.current;
    const [pRes, sRes, cRes] = await Promise.all([
      fetch('/api/v1/products', { headers: { 'x-organization-id': orgId } }),
      fetch('/api/v1/strategies', { headers: { 'x-organization-id': orgId } }),
      fetch('/api/v1/creations', { headers: { 'x-organization-id': orgId } }),
    ]);
    const pJson = await pRes.json();
    const sJson = await sRes.json();
    const cJson = await cRes.json();
    if (sequence !== loadSequence.current) return;
    if (pJson.ok) {
      setProducts(pJson.data);
      if (pJson.data[0] && !productId) setProductId(pJson.data[0].id);
    }
    if (sJson.ok) setStrategies(sJson.data);
    if (cJson.ok) {
      setProjects(cJson.data);
      if (cJson.data.length > 0 && !selection.current) {
        selectProject(cJson.data[0]);
      }
    }
  }

  function selectProject(p: ContentProject) {
    selection.current = p.id;
    setSelectedProjectId(p.id);
    setCopied(false);
    const v = p.versions[0];
    if (v) {
      setEditTitle(v.selected_title);
      setEditBody(v.body_copy);
      setEditCover(v.cover_design_note);
      setEditCta(v.conversion_cta);
    }
  }

  useEffect(() => {
    loadAll();
    return () => { loadSequence.current++; };
  }, [orgId]);

  async function handleGenerateTopics() {
    setGenerating(true);
    setNotice('');
    try {
      const res = await fetch('/api/v1/creations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-organization-id': orgId },
        body: JSON.stringify({
          action: 'topics',
          productId,
          targetPlatform: platform,
          targetAudience: audience,
          marketingGoal: goal,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setTopicIdeas(json.data.topics || []);
        setNotice(`已基于企业知识库生成 ${json.data.topics?.length || 0} 个选题（模式：${json.data.dataOrigin}）`);
      } else {
        setNotice(`${json.error?.message} ${json.error?.guidance || ''}`);
      }
    } finally {
      setGenerating(false);
    }
  }

  async function handleGenerateFull(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);
    setNotice('');
    try {
      const res = await fetch('/api/v1/creations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-organization-id': orgId },
        body: JSON.stringify({
          action: 'generate',
          productId,
          strategyId: strategyId || undefined,
          topic,
          targetPlatform: platform,
          targetAudience: audience,
          marketingGoal: goal,
          contentStyle: style,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        await loadAll();
        selectProject(json.data);
        setNotice('已生成完整文案与多页图文方案，并关联企业知识引用！');
      } else {
        setNotice(`${json.error?.message} ${json.error?.guidance || ''}`);
      }
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveDraft(reviewStatus: 'draft' | 'pending_review' | 'approved' = 'draft') {
    const projectId = selectedProjectId;
    if (!projectId) return;
    setSaving(true);
    setNotice('');
    try {
      const res = await fetch(`/api/v1/creations/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-organization-id': orgId },
        body: JSON.stringify({
          selectedTitle: editTitle,
          bodyCopy: editBody,
          coverDesignNote: editCover,
          conversionCta: editCta,
          reviewStatus,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        await loadAll();
        if (selection.current === projectId) selectProject(json.data);
        setNotice(`已保存新版本草稿（审核状态：${reviewStatus}）。`);
      }
    } finally {
      setSaving(false);
    }
  }

  function getExportText() {
    return [editTitle, editBody, hashtags.join(' '), editCta].filter(Boolean).join('\n\n');
  }

  async function handleCopyAll() {
    try {
      await navigator.clipboard.writeText(getExportText());
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setNotice('复制未完成，请使用下载正文。');
    }
  }

  function handleDownload() {
    const url = URL.createObjectURL(new Blob([getExportText()], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeProject?.id ?? 'draft'}.txt`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const activeProject = projects.find((p) => p.id === selectedProjectId);
  const latestVersion = activeProject?.versions[0];
  const titles: string[] = latestVersion ? JSON.parse(latestVersion.titles_json || '[]') : [];
  const hashtags: string[] = latestVersion ? JSON.parse(latestVersion.hashtags_json || '[]') : [];
  const carousel: Array<{ page: number; title: string; visual: string; copy: string; imageUrl?: string }> = latestVersion
    ? JSON.parse(latestVersion.carousel_plan_json || '[]')
    : [];
  const citations: Array<{ documentId?: string; title: string; category: string; verificationStatus: string }> = latestVersion
    ? JSON.parse(latestVersion.knowledge_citations_json || '[]')
    : [];
  const riskCheck: { passed?: boolean; warnings?: string[] } = latestVersion
    ? JSON.parse(latestVersion.risk_check_json || '{}')
    : {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#183a30]">AI 内容创作中心</h1>
        <p className="text-xs text-[#53605a] mt-0.5">
          检索企业知识库生成选题、多标题、正文与多页图文方案；支持大尺寸实时编辑、多版本保存与人工审核。
        </p>
      </div>

      {notice && (
        <div className="p-3 rounded bg-[#ebe6da] border border-[#d8cfb8] text-xs text-[#183a30]">{notice}</div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* 左侧创作配置栏 (4列) */}
        <div className="xl:col-span-4 space-y-4">
          <form onSubmit={handleGenerateFull} className="bg-[#fcfbf8] border border-[#dfd9cb] rounded p-4 space-y-3">
            <h2 className="text-sm font-semibold text-[#183a30]">创作参数配置</h2>
            <div>
              <label className="block text-[11px] text-[#53605a] mb-1">文旅产品</label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full px-2.5 py-2 text-xs rounded border border-[#dfd9cb] bg-white"
              >
                {products.length === 0 && <option value="">暂无产品（将基于企业简介创作）</option>}
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.verification_status === 'verified' ? '已核实' : '待核实'})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-[#53605a] mb-1">目标平台</label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs rounded border border-[#dfd9cb] bg-white"
                >
                  <option value="xiaohongshu">小红书图文</option>
                  <option value="douyin">抖音短视频脚本</option>
                  <option value="wechat">微信公众号</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-[#53605a] mb-1">参考策略卡片</label>
                <select
                  value={strategyId}
                  onChange={(e) => setStrategyId(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs rounded border border-[#dfd9cb] bg-white"
                >
                  <option value="">不使用特定策略</option>
                  {strategies.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <input
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="目标客群"
              className="w-full px-2.5 py-2 text-xs rounded border border-[#dfd9cb] bg-white"
            />
            <input
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="营销目的"
              className="w-full px-2.5 py-2 text-xs rounded border border-[#dfd9cb] bg-white"
            />
            <input
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              placeholder="内容风格"
              className="w-full px-2.5 py-2 text-xs rounded border border-[#dfd9cb] bg-white"
            />
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] text-[#53605a]">营销选题（可留空自动生成或先点右侧灵感）</label>
                <button
                  type="button"
                  onClick={handleGenerateTopics}
                  disabled={generating}
                  className="text-[11px] text-[#4c7364] hover:underline"
                >
                  生成选题灵感
                </button>
              </div>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="输入或点击下方生成的选题..."
                className="w-full px-2.5 py-2 text-xs rounded border border-[#dfd9cb] bg-white"
              />
            </div>

            {topicIdeas.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {topicIdeas.map((t, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setTopic(t.topic)}
                    className="w-full text-left p-2 rounded bg-[#f5f2eb] hover:bg-[#ebe6da] text-[11px] border border-[#e5dfd2]"
                  >
                    <div className="font-medium text-[#183a30]">{t.topic}</div>
                    <div className="text-[#7c8781]">{t.angle}</div>
                  </button>
                ))}
              </div>
            )}

            <button
              type="submit"
              disabled={generating}
              className="w-full py-2.5 rounded bg-[#183a30] hover:bg-[#214e41] text-white text-sm font-medium inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              <Sparkles className="w-4 h-4" />
              {generating ? '正在检索知识库并创作...' : '生成文案与图文方案'}
            </button>
          </form>

          {/* 历史创作项目列表 */}
          <div className="bg-[#fcfbf8] border border-[#dfd9cb] rounded p-4 space-y-2">
            <div className="text-xs font-semibold text-[#183a30]">创作项目与草稿 ({projects.length})</div>
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => selectProject(p)}
                className={`w-full text-left p-2.5 rounded text-xs border transition-colors ${
                  selectedProjectId === p.id
                    ? 'bg-[#e3ede8] border-[#183a30]'
                    : 'bg-[#f5f2eb] border-[#e5dfd2] hover:border-[#b5ad9b]'
                }`}
              >
                <div className="font-medium text-[#1a2420] line-clamp-1">{p.topic}</div>
                <div className="flex justify-between text-[11px] text-[#7c8781] mt-1">
                  <span>{p.target_platform}</span>
                  <span>{p.review_status} · v{p.versions[0]?.version_number ?? 1}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 右侧大尺寸编辑与图文预览区 (8列) */}
        <div className="xl:col-span-8 bg-[#fcfbf8] border border-[#dfd9cb] rounded p-5 space-y-5">
          {!activeProject || !latestVersion ? (
            <div className="py-16 text-center text-sm text-[#7c8781]">
              请在左侧配置参数并点击「生成文案与图文方案」，或选择一个已有草稿进行编辑。
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ebe6da] pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#183a30]" />
                  <span className="text-sm font-semibold text-[#183a30]">
                    当前版本 v{latestVersion.version_number}
                  </span>
                  <span className="px-2 py-0.5 text-[10px] rounded bg-[#ebe6da] text-[#53605a]">
                    {latestVersion.data_origin === 'test_mode'
                      ? '测试模式生成'
                      : latestVersion.data_origin === 'demo'
                      ? '演示数据'
                      : latestVersion.data_origin === 'external_agent'
                      ? 'Codex 创作 · 演示企业'
                      : '真实保存'}
                  </span>
                  <span className="px-2 py-0.5 text-[10px] rounded border border-[#dfd9cb] text-[#183a30]">
                    审核状态：{activeProject.review_status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleCopyAll}
                    className="px-3 py-1.5 rounded border border-[#dfd9cb] text-xs inline-flex items-center gap-1 hover:bg-[#f5f2eb]"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-[#4c7364]" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? '已复制' : '复制全文'}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="px-3 py-1.5 rounded border border-[#dfd9cb] text-xs hover:bg-[#f5f2eb]"
                  >
                    下载正文
                  </button>
                  <button
                    onClick={() => handleSaveDraft('draft')}
                    disabled={saving}
                    className="px-3 py-1.5 rounded bg-[#183a30] text-white text-xs inline-flex items-center gap-1"
                  >
                    <Save className="w-3.5 h-3.5" />
                    保存草稿
                  </button>
                  <button
                    onClick={() => handleSaveDraft('pending_review')}
                    disabled={saving}
                    className="px-3 py-1.5 rounded border border-[#183a30] text-[#183a30] text-xs hover:bg-[#ebe6da]"
                  >
                    提交人工审核
                  </button>
                </div>
              </div>

              {/* 风险提示 */}
              {riskCheck.warnings && riskCheck.warnings.length > 0 && (
                <div className="p-3 rounded bg-[#f4e5e1] border border-[#e3c3ba] text-xs text-[#8f422d] space-y-1">
                  <div className="font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> 内容事实与合规提醒
                  </div>
                  {riskCheck.warnings.map((w, i) => (
                    <div key={i}>• {w}</div>
                  ))}
                </div>
              )}

              {/* 备选标题切换 */}
              {titles.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-xs text-[#53605a]">候选标题方案（点击填入）：</div>
                  <div className="flex flex-wrap gap-2">
                    {titles.map((t, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setEditTitle(t)}
                        className="px-2.5 py-1 rounded bg-[#f5f2eb] hover:bg-[#ebe6da] border border-[#e5dfd2] text-xs text-left"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 大尺寸标题与正文编辑器 */}
              <div className="space-y-3">
                <div>
                  <label htmlFor="draft-title" className="block text-xs font-medium text-[#53605a] mb-1">主标题</label>
                  <input
                    id="draft-title"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-base font-medium rounded border border-[#dfd9cb] bg-white focus:outline-none focus:border-[#183a30]"
                  />
                </div>
                <div>
                  <label htmlFor="draft-body" className="block text-xs font-medium text-[#53605a] mb-1">发布正文（可直接编辑并保存新版本）</label>
                  <textarea
                    rows={10}
                    id="draft-body"
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    className="w-full px-3.5 py-3 text-sm leading-relaxed rounded border border-[#dfd9cb] bg-white focus:outline-none focus:border-[#183a30]"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#53605a] mb-1">封面设计说明</label>
                    <textarea
                      rows={2}
                      value={editCover}
                      onChange={(e) => setEditCover(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded border border-[#dfd9cb] bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#53605a] mb-1">转化引导 (CTA)</label>
                    <textarea
                      rows={2}
                      value={editCta}
                      onChange={(e) => setEditCta(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded border border-[#dfd9cb] bg-white"
                    />
                  </div>
                </div>
              </div>

              {hashtags.length > 0 && <div className="text-xs text-[#4c7364]">{hashtags.join(' ')}</div>}

              {/* 多页图文创作方案 */}
              {carousel.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-[#ebe6da]">
                  <div className="text-xs font-semibold text-[#183a30]">多页图文分镜方案 ({carousel.length} 页)</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {carousel.map((slide) => (
                      <div key={slide.page} className="p-3 rounded bg-[#f5f2eb] border border-[#e5dfd2] text-xs space-y-1">
                        <div className="font-semibold text-[#183a30]">P{slide.page} · {slide.title}</div>
                        {slide.imageUrl?.startsWith('/demo-assets/') ? (
                          <>
                            <a href={slide.imageUrl} target="_blank" rel="noreferrer">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={slide.imageUrl} alt={`第 ${slide.page} 页成品 · ${slide.title}`}
                                width={1080} height={1440} className="w-full h-auto rounded border border-[#dfd9cb]" />
                            </a>
                            <a href={slide.imageUrl} download className="block text-[#31594b] underline">下载第 {slide.page} 页 PNG</a>
                          </>
                        ) : (
                          <div className="aspect-[3/4] p-3.5 rounded bg-[#fcfbf8] border border-[#dfd9cb] flex flex-col justify-between">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-[10px] text-[#4c7364]">
                                <span>PAGE {slide.page}</span>
                                <span className="px-1.5 py-0.5 rounded bg-[#e3ede8] text-[#183a30]">3:4 概念排版</span>
                              </div>
                              <div className="w-6 h-0.5 bg-[#b48446]" />
                              <div className="text-xs font-semibold text-[#183a30] leading-snug">{slide.title}</div>
                              <div className="text-[11px] text-[#53605a] leading-relaxed">{slide.copy}</div>
                            </div>
                            <div className="text-[10px] text-center py-1 rounded bg-[#ebe6da] text-[#7c8781]">
                              概念示意 · 非真实景区实景
                            </div>
                          </div>
                        )}
                        <div className="text-[11px] text-[#4c7364]">画面：{slide.visual}</div>
                        <div className="text-[#53605a]">{slide.copy}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 企业知识引用溯源 */}
              <div className="pt-2 border-t border-[#ebe6da]">
                <div className="text-xs font-semibold text-[#183a30] mb-1.5">企业知识引用溯源 ({citations.length})</div>
                {citations.length === 0 ? (
                  <div className="text-xs text-[#7c8781]">未检索到相关企业知识文档。</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {citations.map((c, i) => (
                      <span
                        key={i}
                        title={c.documentId}
                        className="px-2.5 py-1 rounded bg-[#e3ede8] text-[#183a30] text-[11px]"
                      >
                        [{c.category}] {c.title} ({c.verificationStatus === 'verified' ? '已核实' : '待核实'})
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
