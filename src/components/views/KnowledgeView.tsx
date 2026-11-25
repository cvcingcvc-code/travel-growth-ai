'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle, FileUp, Search, Trash2, AlertTriangle } from 'lucide-react';

const CATEGORIES = [
  { code: 'ALL', label: '全部分类' },
  { code: 'A_FACTS', label: 'A. 企业基本事实' },
  { code: 'B_PRODUCTS', label: 'B. 产品与服务' },
  { code: 'C_BRAND', label: 'C. 品牌及客群' },
  { code: 'D_STRATEGIES', label: 'D. 案例与策略' },
  { code: 'E_EXPERIENCE', label: 'E. 历史经验' },
  { code: 'F_SYSTEM_AGENT', label: 'F. 系统与Agent' },
];

interface KnowledgeDoc {
  id: string;
  category: string;
  title: string;
  content: string;
  source_type: string;
  source_ref: string;
  verification_status: string;
  version: number;
  is_demo: number;
  updated_at: string;
}

interface SearchHit {
  documentId: string;
  title: string;
  category: string;
  verificationStatus: string;
  snippet: string;
  score: number;
}

export function KnowledgeView({ orgId }: { orgId: string }) {
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [activeCat, setActiveCat] = useState('ALL');
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[] | null>(null);

  const [newCat, setNewCat] = useState('A_FACTS');
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [verified, setVerified] = useState(true);
  const [notice, setNotice] = useState('');

  async function loadDocs() {
    const res = await fetch(`/api/v1/knowledge?category=${activeCat}`, {
      headers: { 'x-organization-id': orgId },
    });
    const json = await res.json();
    if (json.ok && json.data.mode === 'list') {
      setDocs(json.data.documents);
    }
  }

  useEffect(() => {
    setHits(null);
    loadDocs();
  }, [orgId, activeCat]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) {
      setHits(null);
      return;
    }
    const res = await fetch(`/api/v1/knowledge?q=${encodeURIComponent(query)}&category=${activeCat}`, {
      headers: { 'x-organization-id': orgId },
    });
    const json = await res.json();
    if (json.ok) setHits(json.data.hits);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setNotice('');
    const res = await fetch('/api/v1/knowledge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-organization-id': orgId },
      body: JSON.stringify({
        category: newCat,
        title: newTitle,
        content: newContent,
        verificationStatus: verified ? 'verified' : 'unverified',
      }),
    });
    const json = await res.json();
    if (json.ok) {
      setNewTitle('');
      setNewContent('');
      setNotice('知识文档已保存并完成分词/向量索引！');
      await loadDocs();
    }
  }

  async function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf' || ext === 'docx') {
      setNotice('PDF / DOCX 解析接口已预留，第一阶段请上传 .md / .txt / .csv 文件。');
      return;
    }
    const text = await file.text();
    const res = await fetch('/api/v1/knowledge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-organization-id': orgId },
      body: JSON.stringify({
        category: newCat,
        title: file.name,
        content: text,
        sourceType: ext === 'csv' ? 'csv' : ext === 'md' ? 'markdown' : 'txt',
        sourceRef: `文件导入: ${file.name}`,
        verificationStatus: 'unverified',
      }),
    });
    if (res.ok) {
      setNotice(`已导入文件 ${file.name}（默认标记为待核实，请人工确认）。`);
      await loadDocs();
    }
  }

  async function toggleVerify(doc: KnowledgeDoc) {
    const next = doc.verification_status === 'verified' ? 'unverified' : 'verified';
    await fetch('/api/v1/knowledge', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-organization-id': orgId },
      body: JSON.stringify({ documentId: doc.id, verificationStatus: next }),
    });
    await loadDocs();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/v1/knowledge?id=${id}`, {
      method: 'DELETE',
      headers: { 'x-organization-id': orgId },
    });
    await loadDocs();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#183a30]">企业六类知识库</h1>
        <p className="text-xs text-[#53605a] mt-0.5">
          AI 创作优先检索已核实资料；未核实的价格、地址、营业时间将自动提示[待核实]。
        </p>
      </div>

      {/* 分类标签 + 搜索栏 */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-[#fcfbf8] border border-[#dfd9cb] rounded p-3">
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c.code}
              onClick={() => setActiveCat(c.code)}
              className={`px-2.5 py-1 rounded text-xs ${
                activeCat === c.code ? 'bg-[#183a30] text-white' : 'bg-[#f5f2eb] text-[#53605a]'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="关键词/语义检索知识库..."
            className="px-3 py-1.5 text-xs rounded border border-[#dfd9cb] bg-white w-56"
          />
          <button type="submit" className="px-3 py-1.5 rounded bg-[#183a30] text-white text-xs inline-flex items-center gap-1">
            <Search className="w-3.5 h-3.5" />
            检索
          </button>
        </form>
      </div>

      {notice && <div className="p-2.5 rounded bg-[#ebe6da] text-xs text-[#183a30]">{notice}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 新增/导入知识表单 */}
        <form onSubmit={handleCreate} className="bg-[#fcfbf8] border border-[#dfd9cb] rounded p-4 space-y-3 h-fit">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#183a30]">录入或导入文档</h2>
            <label className="cursor-pointer text-xs text-[#4c7364] inline-flex items-center gap-1 hover:underline">
              <FileUp className="w-3.5 h-3.5" />
              <span>导入 MD/TXT/CSV</span>
              <input type="file" accept=".md,.txt,.csv,.pdf,.docx" className="hidden" onChange={handleFileImport} />
            </label>
          </div>
          <select
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded border border-[#dfd9cb] bg-white"
          >
            {CATEGORIES.filter((c) => c.code !== 'ALL').map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
          <input
            required
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="知识文档标题 *"
            className="w-full px-3 py-2 text-sm rounded border border-[#dfd9cb] bg-white"
          />
          <textarea
            required
            rows={5}
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="输入真实企业资料、产品参数、品牌禁忌或运营经验..."
            className="w-full px-3 py-2 text-sm rounded border border-[#dfd9cb] bg-white"
          />
          <label className="flex items-center gap-2 text-xs text-[#53605a]">
            <input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} />
            <span>已人工核实事实准确（价格/时间/地址已确认）</span>
          </label>
          <button type="submit" className="w-full py-2 rounded bg-[#183a30] text-white text-sm font-medium">
            保存并建立检索索引
          </button>
        </form>

        {/* 文档列表或检索命中结果 */}
        <div className="lg:col-span-2 space-y-3">
          {hits ? (
            <div className="bg-[#fcfbf8] border border-[#dfd9cb] rounded p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#183a30]">检索命中结果 ({hits.length})</h3>
                <button onClick={() => setHits(null)} className="text-xs text-[#4c7364] hover:underline">
                  返回全部文档
                </button>
              </div>
              {hits.length === 0 ? (
                <div className="text-xs text-[#7c8781] py-6 text-center">未检索到匹配的知识切片。</div>
              ) : (
                hits.map((h, i) => (
                  <div key={i} className="p-3 rounded bg-[#f5f2eb] border border-[#e5dfd2] text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="font-semibold text-[#183a30]">{h.title}</span>
                      <span className="text-[#4c7364]">相关度 {(h.score * 100).toFixed(0)}%</span>
                    </div>
                    <p className="text-[#53605a]">{h.snippet}</p>
                  </div>
                ))
              )}
            </div>
          ) : docs.length === 0 ? (
            <div className="bg-[#fcfbf8] border border-[#dfd9cb] rounded p-8 text-center text-xs text-[#7c8781]">
              当前分类暂无知识文档，请在左侧录入。
            </div>
          ) : (
            docs.map((d) => (
              <div key={d.id} className="bg-[#fcfbf8] border border-[#dfd9cb] rounded p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-[10px] rounded bg-[#ebe6da] text-[#183a30]">{d.category}</span>
                      <h3 className="text-sm font-semibold text-[#1a2420]">{d.title}</h3>
                      <span className="text-[11px] text-[#7c8781]">v{d.version}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleVerify(d)}
                      className={`px-2 py-0.5 rounded text-[11px] inline-flex items-center gap-1 ${
                        d.verification_status === 'verified'
                          ? 'bg-[#e3ede8] text-[#183a30]'
                          : 'bg-[#f4e5e1] text-[#b05b43]'
                      }`}
                    >
                      {d.verification_status === 'verified' ? (
                        <>
                          <CheckCircle className="w-3 h-3" /> 已核实
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3 h-3" /> 待核实
                        </>
                      )}
                    </button>
                    <button onClick={() => handleDelete(d.id)} className="text-[#7c8781] hover:text-[#b05b43]" title="删除">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-[#53605a] whitespace-pre-wrap leading-relaxed">{d.content}</p>
                <div className="text-[11px] text-[#7c8781]">
                  来源：{d.source_ref} · 更新于：{d.updated_at}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
