'use client';

import React, { useEffect, useState } from 'react';
import { ExternalLink, FileSpreadsheet, Globe, PlusCircle, AlertCircle } from 'lucide-react';

interface IntelItem {
  id: string;
  title: string;
  summary: string;
  raw_content: string;
  category: string;
  source_name: string;
  source_url: string;
  collected_at: string;
  is_demo: number;
}

interface SourceItem {
  id: string;
  name: string;
  source_type: string;
  connection_status: string;
  status_note: string;
}

export function IntelligenceView({ orgId }: { orgId: string }) {
  const [items, setItems] = useState<IntelItem[]>([]);
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'manual' | 'url' | 'rss' | 'csv'>('manual');

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('trend');
  const [sourceUrl, setSourceUrl] = useState('');
  const [rawContent, setRawContent] = useState('');
  const [csvText, setCsvText] = useState('title,category,source_url,summary\n示例：秋冬季私汤搜索量提升,trend,https://example.com,适合周末短途客群');
  const [message, setMessage] = useState('');

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/intelligence?category=${categoryFilter}`, {
        headers: { 'x-organization-id': orgId },
      });
      const json = await res.json();
      if (json.ok) {
        setItems(json.data.items);
        setSources(json.data.sources);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [orgId, categoryFilter]);

  async function handleIngest(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    const payload =
      mode === 'csv'
        ? { mode: 'csv', csvText }
        : mode === 'url' || mode === 'rss'
        ? { mode, url: sourceUrl }
        : { mode: 'manual', title, category, sourceUrl, rawContent };

    const res = await fetch('/api/v1/intelligence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-organization-id': orgId },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (json.ok) {
      setMessage(json.data.duplicated ? '检测到重复内容，已自动去重。' : '情报导入成功并已持久化！');
      setTitle('');
      setRawContent('');
      await loadData();
    } else {
      setMessage(`导入失败：${json.error?.message}`);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#1d4ed8]">市场情报中心</h1>
        <p className="text-xs text-[#475569] mt-0.5">
          支持手动录入、公开 URL、RSS 与 CSV 导入并自动去重；未授权平台适配器明确保持未接通状态。
        </p>
      </div>

      {/* 平台适配器状态条 */}
      <div className="bg-[#ffffff] border border-[#e2e8f0] rounded p-4">
        <div className="text-xs font-semibold text-[#1d4ed8] mb-2.5">数据来源与平台适配器状态</div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {sources.map((s) => (
            <div key={s.id} className="p-2.5 rounded bg-[#f8fafc] border border-[#e2e8f0] text-xs">
              <div className="flex items-center justify-between gap-1">
                <span className="font-medium truncate">{s.name}</span>
                <span
                  className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] ${
                    s.connection_status === 'connected'
                      ? 'bg-[#eff6ff] text-[#1d4ed8]'
                      : 'bg-[#fef2f2] text-[#dc2626]'
                  }`}
                >
                  {s.connection_status === 'connected' ? '已就绪' : '未接通'}
                </span>
              </div>
              <div className="text-[11px] text-[#64748b] mt-1 line-clamp-2">{s.status_note}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 左侧采集录入面板 */}
        <form onSubmit={handleIngest} className="bg-[#ffffff] border border-[#e2e8f0] rounded p-4 space-y-3 h-fit">
          <div className="flex gap-1.5 border-b border-[#f1f5f9] pb-2">
            {[
              { id: 'manual', label: '手动录入', icon: PlusCircle },
              { id: 'url', label: '公开URL', icon: Globe },
              { id: 'rss', label: 'RSS订阅', icon: Globe },
              { id: 'csv', label: 'CSV导入', icon: FileSpreadsheet },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id as typeof mode)}
                className={`px-2.5 py-1 rounded text-xs ${
                  mode === m.id ? 'bg-[#1d4ed8] text-white' : 'bg-[#f8fafc] text-[#475569]'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {mode === 'manual' && (
            <>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="情报标题 *"
                className="w-full px-3 py-2 text-sm rounded border border-[#e2e8f0] bg-white"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="px-2.5 py-2 text-xs rounded border border-[#e2e8f0] bg-white"
                >
                  <option value="trend">消费趋势</option>
                  <option value="policy">行业/文旅政策</option>
                  <option value="competitor">竞品动态</option>
                  <option value="festival">节庆节点</option>
                  <option value="platform_rule">平台规则</option>
                </select>
                <input
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="原文链接（可选）"
                  className="px-2.5 py-2 text-xs rounded border border-[#e2e8f0] bg-white"
                />
              </div>
              <textarea
                required
                rows={4}
                value={rawContent}
                onChange={(e) => setRawContent(e.target.value)}
                placeholder="粘贴市场情报正文或观察要点..."
                className="w-full px-3 py-2 text-sm rounded border border-[#e2e8f0] bg-white"
              />
            </>
          )}

          {(mode === 'url' || mode === 'rss') && (
            <input
              required
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder={mode === 'rss' ? '输入公开 RSS XML 地址' : '输入合规公开网页 URL'}
              className="w-full px-3 py-2 text-sm rounded border border-[#e2e8f0] bg-white"
            />
          )}

          {mode === 'csv' && (
            <textarea
              rows={5}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono rounded border border-[#e2e8f0] bg-white"
            />
          )}

          {message && (
            <div className="text-xs p-2 rounded bg-[#f1f5f9] text-[#1d4ed8] flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2 rounded bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-sm font-medium"
          >
            采集并存入企业情报库
          </button>
        </form>

        {/* 右侧情报列表 */}
        <div className="lg:col-span-2 bg-[#ffffff] border border-[#e2e8f0] rounded p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-2">
            <div className="text-sm font-semibold text-[#1d4ed8]">已采集情报 ({items.length})</div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1 text-xs rounded border border-[#e2e8f0] bg-white"
            >
              <option value="ALL">全部分类</option>
              <option value="trend">消费趋势</option>
              <option value="policy">行业政策</option>
              <option value="competitor">竞品动态</option>
              <option value="platform_rule">平台规则</option>
            </select>
          </div>

          {loading ? (
            <div className="text-xs text-[#64748b] py-8 text-center">加载中...</div>
          ) : items.length === 0 ? (
            <div className="text-xs text-[#64748b] py-8 text-center">暂无市场情报记录。</div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="p-3.5 rounded bg-[#f8fafc] border border-[#e2e8f0]">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-medium text-[#0f172a]">{item.title}</h3>
                    <span className="shrink-0 px-2 py-0.5 text-[10px] rounded bg-[#ffffff] border border-[#e2e8f0]">
                      {item.is_demo ? '演示数据' : item.category}
                    </span>
                  </div>
                  <p className="text-xs text-[#475569] mt-1.5 leading-relaxed">{item.raw_content}</p>
                  <div className="flex items-center justify-between text-[11px] text-[#64748b] mt-2 pt-2 border-t border-[#e2e8f0]">
                    <span>来源：{item.source_name} · 采集时间：{item.collected_at}</span>
                    {item.source_url && (
                      <a
                        href={item.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[#2563eb] hover:underline"
                      >
                        原文 <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
