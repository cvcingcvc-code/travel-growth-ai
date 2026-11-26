'use client';

import React, { useEffect, useState } from 'react';
import { BookOpen, Check, CheckCircle2, Copy, Download, FileArchive, FileText, PenTool, Send, ShieldAlert, Smartphone, Target } from 'lucide-react';
import type { NavTab } from '../AppShell';

interface ContentVersion {
  id: string;
  version_number: number;
  selected_title: string;
  body_copy: string;
  carousel_plan_json: string;
  hashtags_json: string;
  conversion_cta: string;
}

interface ContentProject {
  id: string;
  topic: string;
  target_platform: string;
  marketing_goal: string;
  review_status: string;
  versions: ContentVersion[];
  publications: Array<{ id: string; platform: string; published_url: string; published_at: string }>;
}

export function PublishCenterView({
  orgId,
  onNavigate,
}: {
  orgId: string;
  onNavigate?: (tab: NavTab) => void;
}) {
  const [projects, setProjects] = useState<ContentProject[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [publishUrlMap, setPublishUrlMap] = useState<Record<string, string>>({});
  const [previewProjectId, setPreviewProjectId] = useState<string | null>(null);
  const [previewSlideIdx, setPreviewSlideIdx] = useState(0);
  const [notice, setNotice] = useState('');

  async function loadProjects() {
    const res = await fetch('/api/v1/creations', { headers: { 'x-organization-id': orgId } });
    const json = await res.json();
    if (json.ok) setProjects(json.data);
  }

  useEffect(() => {
    loadProjects();
  }, [orgId]);

  function handleCopyAll(p: ContentProject) {
    const v = p.versions[0];
    if (!v) return;
    const tags: string[] = JSON.parse(v.hashtags_json || '[]');
    const text = `${v.selected_title}\n\n${v.body_copy}\n\n${tags.join(' ')}\n\n${v.conversion_cta}`;
    navigator.clipboard?.writeText(text);
    setCopiedId(p.id);
    setNotice('已一键复制标题、正文、话题标签与转化引导。因浏览器剪贴板限制，请配合右侧「导出 ZIP 发布包」或单图下载使用。');
    setTimeout(() => setCopiedId(null), 2000);
  }

  function handleDownloadTxt(p: ContentProject) {
    const v = p.versions[0];
    if (!v) return;
    const tags: string[] = JSON.parse(v.hashtags_json || '[]');
    const content = `${v.selected_title}\n\n${v.body_copy}\n\n${tags.join(' ')}\n\n${v.conversion_cta}`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${p.id}-copy.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDownloadZip(p: ContentProject) {
    const res = await fetch(`/api/v1/publish-package/${p.id}`, {
      headers: { 'x-organization-id': orgId },
    });
    if (!res.ok) {
      setNotice('导出 ZIP 发布包失败，请重试。');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `publish-package-${p.id}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    setNotice(`已导出图文发布包 publish-package-${p.id}.zip（含文案 copy.txt、元数据与全部配图）。`);
  }

  async function handleApprove(p: ContentProject) {
    const v = p.versions[0];
    if (!v) return;
    const res = await fetch(`/api/v1/creations/${p.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-organization-id': orgId },
      body: JSON.stringify({
        selectedTitle: v.selected_title,
        bodyCopy: v.body_copy,
        reviewStatus: 'approved',
      }),
    });
    if (res.ok) {
      setNotice(`「${v.selected_title}」已通过人工审核，可手动分发并记录发布链接。`);
      await loadProjects();
    }
  }

  async function handleMarkPublished(p: ContentProject) {
    const v = p.versions[0];
    if (!v) return;
    const res = await fetch(`/api/v1/creations/${p.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-organization-id': orgId },
      body: JSON.stringify({
        action: 'record_publication',
        versionId: v.id,
        platform: p.target_platform,
        publishedUrl: publishUrlMap[p.id] || '',
        humanConfirmed: true,
      }),
    });
    if (res.ok) {
      setNotice(`已登记人工发布记录！现在可前往「数据复盘」录入该篇帖子的真实流量指标。`);
      await loadProjects();
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#0f172a] flex items-center gap-2">
          <Send className="w-5 h-5 text-[#1d4ed8]" /> 发布中心与社交媒体发布包
        </h1>
        <p className="text-xs text-[#64748b] mt-0.5">
          未取得平台官方授权前不执行自动发布；提供一键复制文案、单图与 ZIP 图文发布包导出、人工审核与发布记录登记。
        </p>
      </div>

      {notice && (
        <div className="p-3 rounded-md bg-[#eff6ff] border border-[#bfdbfe] text-xs text-[#1e40af] flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="bg-white border border-[#e2e8f0] rounded-lg p-10 text-center text-xs text-[#64748b]">
          暂无待发布内容，请先在「内容生产」生成图文草稿。
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map((p) => {
            const v = p.versions[0];
            if (!v) return null;
            const tags: string[] = JSON.parse(v.hashtags_json || '[]');
            const slides: Array<{ page: number; title: string; imageUrl?: string }> = JSON.parse(v.carousel_plan_json || '[]');
            const images = slides.filter((s) => s.imageUrl && s.imageUrl.startsWith('/demo-assets/'));

            return (
              <div key={p.id} className="bg-white border border-[#e2e8f0] rounded-lg p-5 space-y-4 text-xs">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#e2e8f0] pb-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-[#eff6ff] text-[#1d4ed8] font-medium">{p.target_platform}</span>
                      <span className={`px-2 py-0.5 rounded font-medium ${p.review_status === 'published_recorded' ? 'bg-emerald-50 text-emerald-700' : p.review_status === 'approved' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
                        {p.review_status}
                      </span>
                      <h2 className="text-sm font-semibold text-[#0f172a]">{v.selected_title}</h2>
                    </div>
                    <div className="text-[#64748b] mt-1">营销目的：{p.marketing_goal} · 当前版本 v{v.version_number}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => { setPreviewProjectId(p.id); setPreviewSlideIdx(0); }} className="px-2.5 py-1.5 rounded border border-[#bfdbfe] bg-[#eff6ff] text-[#1d4ed8] font-medium inline-flex items-center gap-1">
                      <Smartphone className="w-3.5 h-3.5" /> 手机图文预览
                    </button>
                    <button onClick={() => handleCopyAll(p)} className="px-2.5 py-1.5 rounded border border-[#e2e8f0] hover:bg-[#f8fafc] inline-flex items-center gap-1">
                      {copiedId === p.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedId === p.id ? '已复制' : '一键复制文案'}
                    </button>
                    <button onClick={() => handleDownloadTxt(p)} className="px-2.5 py-1.5 rounded border border-[#e2e8f0] hover:bg-[#f8fafc] inline-flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" /> 导出 TXT
                    </button>
                    <button onClick={() => handleDownloadZip(p)} className="px-3 py-1.5 rounded bg-[#0f172a] hover:bg-slate-800 text-white inline-flex items-center gap-1">
                      <FileArchive className="w-3.5 h-3.5" /> 导出 ZIP 发布包
                    </button>
                    {p.review_status !== 'approved' && p.review_status !== 'published_recorded' && (
                      <button onClick={() => handleApprove(p)} className="px-3 py-1.5 rounded bg-emerald-600 text-white inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> 人工审核通过
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  <div className="lg:col-span-8 space-y-2">
                    <div className="p-3 rounded bg-[#f8fafc] border border-[#e2e8f0] whitespace-pre-wrap text-[#334155] leading-relaxed max-h-48 overflow-y-auto">
                      {v.body_copy}
                    </div>
                    {tags.length > 0 && <div className="text-[#1d4ed8]">{tags.join(' ')}</div>}
                  </div>
                  <div className="lg:col-span-4 space-y-2">
                    <div className="font-medium text-[#0f172a]">关联配图 ({images.length})</div>
                    {images.length === 0 ? (
                      <div className="p-4 rounded bg-[#f8fafc] border border-[#e2e8f0] text-[#94a3b8] text-center">暂无挂载静态图片</div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {images.map((img) => (
                          <div key={img.page} className="space-y-1">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={img.imageUrl} alt={img.title} className="w-full aspect-[3/4] object-cover rounded border border-[#e2e8f0]" />
                            <a href={img.imageUrl} download className="text-[11px] text-[#1d4ed8] inline-flex items-center gap-0.5 hover:underline">
                              <Download className="w-3 h-3" /> 下载 P{img.page}
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#64748b]">
                  {onNavigate && (
                    <>
                      <button onClick={() => onNavigate('campaigns')} className="inline-flex items-center gap-1 text-[#1d4ed8] hover:underline"><Target className="w-3 h-3" /> 返回关联营销方案</button>
                      <button onClick={() => onNavigate('knowledge')} className="inline-flex items-center gap-1 text-[#1d4ed8] hover:underline"><BookOpen className="w-3 h-3" /> 查看引用知识库</button>
                      <button onClick={() => onNavigate('creation')} className="inline-flex items-center gap-1 text-[#1d4ed8] hover:underline"><PenTool className="w-3 h-3" /> 重新编辑正文</button>
                    </>
                  )}
                </div>

                {/* 人工标记已发布 */}
                <div className="pt-3 border-t border-[#e2e8f0] flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    value={publishUrlMap[p.id] || ''}
                    onChange={(e) => setPublishUrlMap((prev) => ({ ...prev, [p.id]: e.target.value }))}
                    placeholder="人工发布后在此粘贴实际帖子链接（可选）"
                    className="flex-1 px-3 py-1.5 rounded border border-[#e2e8f0] bg-[#f8fafc]"
                  />
                  <button
                    onClick={() => handleMarkPublished(p)}
                    className="px-3.5 py-1.5 rounded bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-medium shrink-0"
                  >
                    确认已人工发布并建档
                  </button>
                </div>

                {p.publications.length > 0 && (
                  <div className="text-[11px] text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded">
                    已记录 {p.publications.length} 次发布 · 最近发布于 {p.publications[0].published_at} {p.publications[0].published_url ? `(${p.publications[0].published_url})` : ''}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 接近真实社交媒体的手机图文预览弹窗 */}
      {previewProjectId && (() => {
        const p = projects.find((x) => x.id === previewProjectId);
        const v = p?.versions[0];
        if (!p || !v) return null;
        const slides: Array<{ page: number; title: string; visual: string; copy: string; imageUrl?: string }> = JSON.parse(v.carousel_plan_json || '[]');
        const tags: string[] = JSON.parse(v.hashtags_json || '[]');
        const curSlide = slides[previewSlideIdx] || slides[0];
        return (
          <div className="fixed inset-0 z-50 bg-slate-900/55 flex items-center justify-center p-4" onClick={() => setPreviewProjectId(null)}>
            <div className="bg-white rounded-[28px] border-4 border-slate-800 w-full max-w-[360px] max-h-[86vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-[#e2e8f0] px-4 py-2.5 flex items-center justify-between text-xs z-10">
                <span className="font-semibold text-[#0f172a]">{p.target_platform} 手机预览</span>
                <button onClick={() => setPreviewProjectId(null)} className="text-[#64748b] hover:text-[#0f172a]">关闭</button>
              </div>
              <div className="aspect-[3/4] bg-[#f1f5f9] relative overflow-hidden flex items-center justify-center">
                {curSlide?.imageUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={curSlide.imageUrl} alt={curSlide.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="p-6 text-center space-y-2">
                    <div className="text-xs font-semibold text-[#1d4ed8]">PAGE {curSlide?.page ?? 1}</div>
                    <div className="text-base font-semibold text-[#0f172a]">{curSlide?.title || v.selected_title}</div>
                    <div className="text-xs text-[#475569]">{curSlide?.copy}</div>
                  </div>
                )}
                {slides.length > 1 && (
                  <div className="absolute bottom-2.5 inset-x-0 flex justify-center gap-1.5">
                    {slides.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setPreviewSlideIdx(idx)}
                        className={`w-2 h-2 rounded-full ${idx === previewSlideIdx ? 'bg-[#1d4ed8]' : 'bg-white/80'}`}
                        aria-label={`切换到第 ${idx + 1} 页`}
                      />
                    ))}
                  </div>
                )}
              </div>
              <div className="p-4 space-y-2.5 text-xs">
                <div className="font-semibold text-sm text-[#0f172a] leading-snug">{v.selected_title}</div>
                <div className="text-[#334155] whitespace-pre-wrap leading-relaxed">{v.body_copy}</div>
                {tags.length > 0 && <div className="text-[#1d4ed8]">{tags.join(' ')}</div>}
                <div className="p-2 rounded bg-[#f8fafc] border border-[#e2e8f0] text-[11px] text-[#64748b]">
                  CTA：{v.conversion_cta}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
