'use client';

import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Clock,
  FileUp,
  Network,
  Search,
  Trash2,
} from 'lucide-react';
import type { NavTab } from '../AppShell';

const CATEGORIES = [
  { code: 'ALL', label: '全部分类' },
  { code: 'A_FACTS', label: 'A. 基本事实' },
  { code: 'B_PRODUCTS', label: 'B. 产品服务' },
  { code: 'C_BRAND', label: 'C. 品牌客群' },
  { code: 'D_STRATEGIES', label: 'D. 案例策略' },
  { code: 'E_EXPERIENCE', label: 'E. 运营经验' },
  { code: 'F_SYSTEM_AGENT', label: 'F. 系统规范' },
];

type SubTab = 'overview' | 'graph' | 'docs' | 'unverified' | 'search' | 'history';

interface GraphData {
  organization: { id: string; name: string; location: string; description: string };
  brandProfile: { positioning: string; visual_guidelines: string } | null;
  stats: {
    totalDocs: number;
    verifiedDocs: number;
    unverifiedDocsCount: number;
    unverifiedProductsCount: number;
    productsCount: number;
    campaignsCount: number;
    casesCount: number;
    coveredCategories: number;
    completenessScore: number;
  };
  documents: Array<{
    id: string;
    category: string;
    title: string;
    content: string;
    source_ref: string;
    verification_status: string;
    version: number;
    updated_at: string;
    is_demo: number;
  }>;
  unverifiedDocs: Array<{ id: string; title: string; category: string; source_ref: string; verification_status: string }>;
  unverifiedProducts: Array<{ id: string; name: string; price_info: string }>;
  graph: {
    nodes: Array<{ id: string; label: string; type: string; status?: string; targetView: string; targetId: string }>;
    edges: Array<{ from: string; to: string; relation: string }>;
  };
  auditLogs: Array<{ id: string; action: string; actor_id: string; target_id: string; detail_json: string; created_at: string }>;
}

export function KnowledgeView({
  orgId,
  focusedDocId,
  onNavigate,
}: {
  orgId: string;
  focusedDocId?: string;
  onNavigate?: (tab: NavTab, itemId?: string) => void;
}) {
  const [subTab, setSubTab] = useState<SubTab>(focusedDocId ? 'docs' : 'overview');
  const [data, setData] = useState<GraphData | null>(null);
  const [catFilter, setCatFilter] = useState('ALL');
  const [selectedDocId, setSelectedDocId] = useState<string>(focusedDocId || '');

  // 新增表单
  const [newCat, setNewCat] = useState('A_FACTS');
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newVerified, setNewVerified] = useState(true);
  const [notice, setNotice] = useState('');

  // 检索测试
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<Array<{ documentId: string; title: string; category: string; verificationStatus: string; snippet: string; score: number }>>([]);
  const [searched, setSearched] = useState(false);

  async function loadGraph() {
    const res = await fetch('/api/v1/knowledge/graph', { headers: { 'x-organization-id': orgId } });
    const json = await res.json();
    if (json.ok) {
      setData(json.data);
      if (focusedDocId) {
        setSelectedDocId(focusedDocId);
        setSubTab('docs');
      }
    }
  }

  useEffect(() => {
    loadGraph();
  }, [orgId, focusedDocId]);

  async function handleCreateDoc(e: React.FormEvent) {
    e.preventDefault();
    setNotice('');
    const res = await fetch('/api/v1/knowledge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-organization-id': orgId },
      body: JSON.stringify({
        category: newCat,
        title: newTitle,
        content: newContent,
        verificationStatus: newVerified ? 'verified' : 'unverified',
      }),
    });
    if (res.ok) {
      setNewTitle('');
      setNewContent('');
      setNotice('知识文档已保存并建立混合检索索引！');
      await loadGraph();
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setNotice('正在无截断解析文件...');
    const fd = new FormData();
    fd.append('file', file);
    const parseRes = await fetch('/api/v1/parse-file', { method: 'POST', body: fd });
    const parseJson = await parseRes.json();
    if (!parseJson.ok) {
      setNotice(parseJson.error?.message || '解析失败');
      return;
    }
    const saveRes = await fetch('/api/v1/knowledge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-organization-id': orgId },
      body: JSON.stringify({
        category: newCat,
        title: parseJson.data.fileName,
        content: parseJson.data.rawText,
        sourceType: parseJson.data.format === 'csv' ? 'csv' : parseJson.data.format === 'markdown' ? 'markdown' : 'txt',
        sourceRef: `无截断导入 (${parseJson.data.charCount}字)`,
        verificationStatus: 'needs_review',
      }),
    });
    if (saveRes.ok) {
      setNotice(`已完整导入「${parseJson.data.fileName}」（${parseJson.data.charCount} 字，未截断），状态为待核实。`);
      await loadGraph();
    }
    e.target.value = '';
  }

  async function toggleVerify(id: string, current: string) {
    const next = current === 'verified' ? 'unverified' : 'verified';
    await fetch('/api/v1/knowledge', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-organization-id': orgId },
      body: JSON.stringify({ documentId: id, verificationStatus: next }),
    });
    await loadGraph();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/v1/knowledge?id=${id}`, { method: 'DELETE', headers: { 'x-organization-id': orgId } });
    await loadGraph();
  }

  async function handleSearchTest(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    const res = await fetch(`/api/v1/knowledge?q=${encodeURIComponent(query)}`, { headers: { 'x-organization-id': orgId } });
    const json = await res.json();
    if (json.ok) {
      setHits(json.data.hits || []);
      setSearched(true);
    }
  }

  if (!data) {
    return <div className="p-8 text-center text-xs text-[#64748b] bg-white border border-[#e2e8f0] rounded-lg">正在加载企业知识中心...</div>;
  }

  const filteredDocs = catFilter === 'ALL' ? data.documents : data.documents.filter((d) => d.category === catFilter);

  // 为真实知识关系图计算环形布局坐标（中心为企业节点，外环为真实关联节点）
  const centerNode = data.graph.nodes[0];
  const outerNodes = data.graph.nodes.slice(1, 17);
  const cx = 360;
  const cy = 210;
  const rx = 250;
  const ry = 155;
  const nodePositions = new Map<string, { x: number; y: number }>();
  if (centerNode) nodePositions.set(centerNode.id, { x: cx, y: cy });
  outerNodes.forEach((n, idx) => {
    const angle = (idx / Math.max(1, outerNodes.length)) * Math.PI * 2 - Math.PI / 2;
    nodePositions.set(n.id, { x: cx + Math.cos(angle) * rx, y: cy + Math.sin(angle) * ry });
  });

  const nodeColor = (type: string) => {
    if (type === 'org') return '#1d4ed8';
    if (type === 'knowledge') return '#0f766e';
    if (type === 'product') return '#b45309';
    if (type === 'campaign') return '#4338ca';
    if (type === 'case') return '#be123c';
    return '#334155';
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[#0f172a] flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#1d4ed8]" /> 企业可视化知识中心
          </h1>
          <p className="text-xs text-[#64748b] mt-0.5">
            知识总览、真实数据库关系图、待核实事项、混合检索测试与版本更新记录。
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs">
          {[
            { id: 'overview', label: '知识总览' },
            { id: 'graph', label: '知识关系图' },
            { id: 'docs', label: `全部文档 (${data.stats.totalDocs})` },
            { id: 'unverified', label: `待核实 (${data.stats.unverifiedDocsCount + data.stats.unverifiedProductsCount})` },
            { id: 'search', label: '检索测试' },
            { id: 'history', label: '更新记录' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id as SubTab)}
              className={`px-3 py-1.5 rounded-md font-medium ${
                subTab === t.id ? 'bg-[#1d4ed8] text-white' : 'bg-white border border-[#e2e8f0] text-[#475569] hover:bg-[#f8fafc]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {notice && <div className="p-3 rounded-md bg-[#eff6ff] border border-[#bfdbfe] text-xs text-[#1e40af]">{notice}</div>}

      {/* 1. 知识总览 */}
      {subTab === 'overview' && (
        <div className="space-y-5 text-xs">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-[#e2e8f0] rounded-lg p-4">
              <div className="text-[#64748b]">知识文档总数</div>
              <div className="text-2xl font-semibold text-[#0f172a] mt-1">{data.stats.totalDocs}</div>
              <div className="text-[11px] text-emerald-700 mt-1">已核实 {data.stats.verifiedDocs} 篇 · 覆盖 {data.stats.coveredCategories}/6 类</div>
            </div>
            <div className="bg-white border border-[#e2e8f0] rounded-lg p-4">
              <div className="text-[#64748b]">待核实风险项</div>
              <div className="text-2xl font-semibold text-amber-600 mt-1">{data.stats.unverifiedDocsCount + data.stats.unverifiedProductsCount}</div>
              <div className="text-[11px] text-[#64748b] mt-1">文档 {data.stats.unverifiedDocsCount} · 产品 {data.stats.unverifiedProductsCount}</div>
            </div>
            <div className="bg-white border border-[#e2e8f0] rounded-lg p-4">
              <div className="text-[#64748b]">关联业务资产</div>
              <div className="text-2xl font-semibold text-[#0f172a] mt-1">{data.stats.productsCount} / {data.stats.campaignsCount} / {data.stats.casesCount}</div>
              <div className="text-[11px] text-[#64748b] mt-1">产品 / 营销方案 / 对标案例</div>
            </div>
            <div className="bg-white border border-[#e2e8f0] rounded-lg p-4">
              <div className="text-[#64748b]">资料完整度</div>
              <div className="text-2xl font-semibold text-[#1d4ed8] mt-1">{data.stats.completenessScore}%</div>
              <div className="w-full h-1.5 bg-[#e2e8f0] rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-[#1d4ed8]" style={{ width: `${data.stats.completenessScore}%` }} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {CATEGORIES.filter((c) => c.code !== 'ALL').map((c) => {
              const catDocs = data.documents.filter((d) => d.category === c.code);
              return (
                <div key={c.code} className="bg-white border border-[#e2e8f0] rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#0f172a]">{c.label}</span>
                    <span className="px-2 py-0.5 rounded bg-[#f1f5f9] text-[#475569]">{catDocs.length} 篇</span>
                  </div>
                  {catDocs.length === 0 ? (
                    <div className="text-[#94a3b8] py-2">尚未录入该类知识，建议在「全部文档」补充。</div>
                  ) : (
                    catDocs.slice(0, 3).map((d) => (
                      <button
                        key={d.id}
                        onClick={() => { setSelectedDocId(d.id); setSubTab('docs'); }}
                        className="w-full text-left p-2 rounded bg-[#f8fafc] hover:bg-[#eff6ff] border border-[#e2e8f0] block"
                      >
                        <div className="font-medium text-[#0f172a] truncate">{d.title}</div>
                        <div className="text-[10px] text-[#64748b] mt-0.5">v{d.version} · {d.verification_status === 'verified' ? '已核实' : '待核实'}</div>
                      </button>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. 可交互真实知识关系图 */}
      {subTab === 'graph' && (
        <div className="bg-white border border-[#e2e8f0] rounded-lg p-5 space-y-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-[#0f172a] flex items-center gap-1.5">
              <Network className="w-4 h-4 text-[#1d4ed8]" /> 企业真实知识关系图（点击节点直接跳转对应详情）
            </h2>
            <div className="flex flex-wrap gap-2 text-[11px]">
              <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#1d4ed8]" /> 企业</span>
              <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#0f766e]" /> 知识文档</span>
              <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#b45309]" /> 产品</span>
              <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#4338ca]" /> 营销方案</span>
              <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#be123c]" /> 对标案例</span>
            </div>
          </div>
          <div className="w-full overflow-x-auto bg-[#f8fafc] border border-[#e2e8f0] rounded-lg p-2">
            <svg viewBox="0 0 720 420" className="w-full min-w-[600px] h-[380px]">
              {data.graph.edges.map((e, idx) => {
                const p1 = nodePositions.get(e.from);
                const p2 = nodePositions.get(e.to);
                if (!p1 || !p2) return null;
                return (
                  <g key={idx}>
                    <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#cbd5e1" strokeWidth="1.5" />
                  </g>
                );
              })}
              {[centerNode, ...outerNodes].filter(Boolean).map((n) => {
                const pos = nodePositions.get(n.id);
                if (!pos) return null;
                const isCenter = n.type === 'org';
                return (
                  <g
                    key={n.id}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    className="cursor-pointer"
                    onClick={() => {
                      if (n.type === 'knowledge') {
                        setSelectedDocId(n.targetId);
                        setSubTab('docs');
                      } else if (onNavigate) {
                        onNavigate(n.targetView as NavTab, n.targetId);
                      }
                    }}
                  >
                    <circle r={isCenter ? 30 : 18} fill={nodeColor(n.type)} opacity="0.92" />
                    <text
                      y={isCenter ? 46 : 31}
                      textAnchor="middle"
                      fill="#0f172a"
                      fontSize={isCenter ? 12 : 10}
                      fontWeight={isCenter ? 600 : 500}
                    >
                      {n.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="text-[11px] text-[#64748b]">
            图谱由当前企业数据库真实外键与归属实时构建（共 {data.graph.nodes.length} 个实体节点，{data.graph.edges.length} 条真实关联）。
          </div>
        </div>
      )}

      {/* 3. 全部文档与无截断导入 */}
      {subTab === 'docs' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 text-xs">
          <form onSubmit={handleCreateDoc} className="bg-white border border-[#e2e8f0] rounded-lg p-4 space-y-3 h-fit">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#0f172a]">录入或无截断导入</h2>
              <label className="cursor-pointer text-[#1d4ed8] font-medium inline-flex items-center gap-1 hover:underline">
                <FileUp className="w-3.5 h-3.5" /> 导入文件
                <input type="file" accept=".md,.txt,.csv,.json,.docx,.xlsx,.pdf" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
            <select value={newCat} onChange={(e) => setNewCat(e.target.value)} className="w-full px-3 py-2 rounded border border-[#e2e8f0] bg-white">
              {CATEGORIES.filter((c) => c.code !== 'ALL').map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
            <input required value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="文档标题 *" className="w-full px-3 py-2 rounded border border-[#e2e8f0]" />
            <textarea required rows={5} value={newContent} onChange={(e) => setNewContent(e.target.value)} placeholder="粘贴完整企业资料..." className="w-full px-3 py-2 rounded border border-[#e2e8f0]" />
            <label className="flex items-center gap-2 text-[#475569]">
              <input type="checkbox" checked={newVerified} onChange={(e) => setNewVerified(e.target.checked)} />
              <span>已人工核实事实准确</span>
            </label>
            <button type="submit" className="w-full py-2 rounded bg-[#1d4ed8] text-white font-medium">保存并建立检索索引</button>
          </form>

          <div className="lg:col-span-2 space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c.code}
                  onClick={() => setCatFilter(c.code)}
                  className={`px-2.5 py-1 rounded ${catFilter === c.code ? 'bg-[#0f172a] text-white' : 'bg-white border border-[#e2e8f0] text-[#475569]'}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            {filteredDocs.map((d) => (
              <div
                key={d.id}
                className={`bg-white rounded-lg p-4 space-y-2 border ${selectedDocId === d.id ? 'border-[#1d4ed8] ring-2 ring-[#eff6ff]' : 'border-[#e2e8f0]'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-[#eff6ff] text-[#1d4ed8] text-[10px] font-medium">{d.category}</span>
                    <h3 className="text-sm font-semibold text-[#0f172a]">{d.title}</h3>
                    <span className="text-[11px] text-[#64748b]">v{d.version} · {d.content.length}字</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleVerify(d.id, d.verification_status)}
                      className={`px-2 py-0.5 rounded text-[11px] inline-flex items-center gap-1 ${
                        d.verification_status === 'verified' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {d.verification_status === 'verified' ? <><CheckCircle2 className="w-3 h-3" /> 已核实</> : <><AlertTriangle className="w-3 h-3" /> 待核实</>}
                    </button>
                    <button onClick={() => handleDelete(d.id)} className="text-[#94a3b8] hover:text-red-600" title="删除">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-[#475569] whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto bg-[#f8fafc] p-3 rounded border border-[#f1f5f9]">
                  {d.content}
                </p>
                <div className="text-[11px] text-[#64748b]">来源：{d.source_ref} · 更新于：{d.updated_at}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. 待核实事项 */}
      {subTab === 'unverified' && (
        <div className="bg-white border border-[#e2e8f0] rounded-lg p-5 space-y-4 text-xs">
          <h2 className="text-sm font-semibold text-[#0f172a]">待人工核实清单（未核实价格/地址/政策严禁 AI 编造）</h2>
          {data.unverifiedDocs.length === 0 && data.unverifiedProducts.length === 0 ? (
            <div className="py-8 text-center text-emerald-700">当前企业所有文档与产品均已完成人工核实！</div>
          ) : (
            <div className="space-y-2">
              {data.unverifiedDocs.map((d) => (
                <div key={d.id} className="p-3 rounded bg-amber-50/70 border border-amber-200 flex items-center justify-between gap-2">
                  <div>
                    <span className="font-semibold text-[#0f172a]">[文档 · {d.category}] {d.title}</span>
                    <div className="text-[11px] text-[#64748b]">来源：{d.source_ref}</div>
                  </div>
                  <button onClick={() => toggleVerify(d.id, d.verification_status)} className="px-3 py-1 rounded bg-emerald-600 text-white shrink-0">
                    标记为已核实
                  </button>
                </div>
              ))}
              {data.unverifiedProducts.map((p) => (
                <div key={p.id} className="p-3 rounded bg-amber-50/70 border border-amber-200 flex items-center justify-between gap-2">
                  <div>
                    <span className="font-semibold text-[#0f172a]">[产品] {p.name}</span>
                    <div className="text-[11px] text-[#64748b]">价格：{p.price_info}</div>
                  </div>
                  {onNavigate && (
                    <button onClick={() => onNavigate('products', p.id)} className="px-3 py-1 rounded bg-[#0f172a] text-white shrink-0">
                      前往产品核实
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. 知识检索测试 */}
      {subTab === 'search' && (
        <div className="bg-white border border-[#e2e8f0] rounded-lg p-5 space-y-4 text-xs">
          <form onSubmit={handleSearchTest} className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="输入业务问题或关键词测试混合检索（如：停车 雨天 价格 视觉规范）..."
              className="flex-1 px-3 py-2 rounded border border-[#e2e8f0] bg-[#f8fafc] focus:bg-white"
            />
            <button type="submit" className="px-4 py-2 rounded bg-[#1d4ed8] text-white font-medium inline-flex items-center gap-1">
              <Search className="w-3.5 h-3.5" /> 测试检索
            </button>
          </form>
          {searched && (
            <div className="space-y-2">
              <div className="font-semibold text-[#0f172a]">命中片段 ({hits.length})</div>
              {hits.length === 0 ? (
                <div className="py-6 text-center text-[#94a3b8]">未命中相关知识切片，建议先补充企业资料。</div>
              ) : (
                hits.map((h, i) => (
                  <div key={i} className="p-3 rounded bg-[#f8fafc] border border-[#e2e8f0] space-y-1">
                    <div className="flex items-center justify-between">
                      <button onClick={() => { setSelectedDocId(h.documentId); setSubTab('docs'); }} className="font-semibold text-[#1d4ed8] hover:underline">
                        [{h.category}] {h.title}
                      </button>
                      <span className="text-emerald-700 font-medium">相关度 {(h.score * 100).toFixed(0)}% · {h.verificationStatus}</span>
                    </div>
                    <p className="text-[#475569]">{h.snippet}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* 6. 知识更新记录 */}
      {subTab === 'history' && (
        <div className="bg-white border border-[#e2e8f0] rounded-lg p-5 space-y-3 text-xs">
          <h2 className="text-sm font-semibold text-[#0f172a] flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-[#1d4ed8]" /> 知识库更新与审计记录 ({data.auditLogs.length})
          </h2>
          {data.auditLogs.length === 0 ? (
            <div className="py-6 text-center text-[#94a3b8]">暂无审计记录。</div>
          ) : (
            data.auditLogs.map((l) => (
              <div key={l.id} className="p-2.5 rounded bg-[#f8fafc] border border-[#e2e8f0] flex justify-between gap-2">
                <span><strong>{l.action}</strong> · 操作人：{l.actor_id} · 目标：<code>{l.target_id}</code></span>
                <span className="text-[#64748b]">{l.created_at}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
