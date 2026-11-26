'use client';

import React, { useEffect, useState } from 'react';
import { BarChart3, BookPlus, Plus, Sparkles, AlertTriangle } from 'lucide-react';

interface ReviewData {
  accounts: Array<{ id: string; platform: string; account_name: string; account_handle: string; auth_status: string; followers_count: number }>;
  publications: Array<{ id: string; platform: string; selected_title: string; topic: string; published_url: string; published_at: string }>;
  metrics: Array<{ id: string; publication_id: string; topic: string; views: number; likes: number; collects: number; comments: number; inquiries: number; bookings: number; takeaway_note: string; recorded_at: string }>;
  insights: Array<{ id: string; sample_size: number; title_finding: string; cover_finding: string; topic_finding: string; weak_strategy_finding: string; next_round_actions_json: string; sample_warning: string; synced_to_kb_doc_id: string | null; created_at: string }>;
}

export function ReviewView({ orgId }: { orgId: string }) {
  const [data, setData] = useState<ReviewData | null>(null);
  const [accPlatform, setAccPlatform] = useState('xiaohongshu');
  const [accName, setAccName] = useState('');
  const [accHandle, setAccHandle] = useState('');

  const [pubId, setPubId] = useState('');
  const [views, setViews] = useState('1200');
  const [likes, setLikes] = useState('86');
  const [collects, setCollects] = useState('142');
  const [comments, setComments] = useState('19');
  const [inquiries, setInquiries] = useState('11');
  const [bookings, setBookings] = useState('3');
  const [sourceLabel, setSourceLabel] = useState('小红书创作者后台手动导出（演示核验样本）');
  const [notice, setNotice] = useState('');

  async function loadAll() {
    const res = await fetch('/api/v1/review', { headers: { 'x-organization-id': orgId } });
    const json = await res.json();
    if (json.ok) {
      setData(json.data);
      if (json.data.publications[0] && !pubId) setPubId(json.data.publications[0].id);
    }
  }

  useEffect(() => {
    setPubId('');
    loadAll();
  }, [orgId]);

  async function handleAddAccount(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/v1/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-organization-id': orgId },
      body: JSON.stringify({ action: 'create_account', platform: accPlatform, accountName: accName, accountHandle: accHandle }),
    });
    if (res.ok) {
      setAccName('');
      setAccHandle('');
      setNotice('社媒账号已登记（当前状态：仅手动/CSV录入，未接通官方自动同步）。');
      await loadAll();
    }
  }

  async function handleRecordMetric(e: React.FormEvent) {
    e.preventDefault();
    if (!pubId) {
      setNotice('请先在「发布中心」标记至少一篇内容为已发布，再录入该篇流量指标。');
      return;
    }
    const res = await fetch('/api/v1/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-organization-id': orgId },
      body: JSON.stringify({
        action: 'record_metric',
        publicationId: pubId,
        views: Number(views),
        likes: Number(likes),
        collects: Number(collects),
        comments: Number(comments),
        inquiries: Number(inquiries),
        bookings: Number(bookings),
        dataSourceLabel: sourceLabel,
      }),
    });
    const json = await res.json();
    if (json.ok) {
      setNotice('发布数据快照已记录并持久化！');
      await loadAll();
    } else {
      setNotice(json.error?.message || '录入失败');
    }
  }

  async function handleRunAnalyze() {
    const res = await fetch('/api/v1/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-organization-id': orgId },
      body: JSON.stringify({ action: 'analyze' }),
    });
    const json = await res.json();
    if (json.ok) {
      setNotice('数据复盘 Agent 分析完成！可审核后一键回流至企业知识库。');
      await loadAll();
    } else {
      setNotice(json.error?.message || '复盘失败');
    }
  }

  async function handleSyncToKb(insightId: string) {
    const res = await fetch('/api/v1/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-organization-id': orgId },
      body: JSON.stringify({ action: 'sync_to_kb', insightId }),
    });
    const json = await res.json();
    if (json.ok) {
      setNotice(`复盘经验已回流写入企业知识库 E_EXPERIENCE（文档 ID: ${json.data.syncedDocumentId}）并同步至专属 Agent 记忆！`);
      await loadAll();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[#0f172a] flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#1d4ed8]" /> 账号数据与复盘优化中心
          </h1>
          <p className="text-xs text-[#64748b] mt-0.5">
            管理社媒账号、记录标明来源的真实发布表现，由数据复盘 Agent 提炼洞察并经人工确认回流企业知识库。
          </p>
        </div>
        <button
          onClick={handleRunAnalyze}
          className="px-4 py-2 rounded-md bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-medium inline-flex items-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" /> 运行数据复盘 Agent
        </button>
      </div>

      {notice && <div className="p-3 rounded-md bg-[#eff6ff] border border-[#bfdbfe] text-xs text-[#1e40af]">{notice}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 text-xs">
        {/* 社媒账号管理 */}
        <div className="bg-white border border-[#e2e8f0] rounded-lg p-4 space-y-3 h-fit">
          <h2 className="text-sm font-semibold text-[#0f172a]">企业社媒账号 ({data?.accounts.length ?? 0})</h2>
          <form onSubmit={handleAddAccount} className="space-y-2">
            <select value={accPlatform} onChange={(e) => setAccPlatform(e.target.value)} className="w-full px-2.5 py-1.5 rounded border border-[#e2e8f0] bg-white">
              <option value="xiaohongshu">小红书</option>
              <option value="douyin">抖音</option>
              <option value="wechat_oa">微信公众号</option>
              <option value="wechat_channels">视频号</option>
            </select>
            <input required value={accName} onChange={(e) => setAccName(e.target.value)} placeholder="账号名称（如：山海拾光官方号）" className="w-full px-2.5 py-1.5 rounded border border-[#e2e8f0]" />
            <input value={accHandle} onChange={(e) => setAccHandle(e.target.value)} placeholder="账号 ID / Handle（可选）" className="w-full px-2.5 py-1.5 rounded border border-[#e2e8f0]" />
            <button type="submit" className="w-full py-1.5 rounded bg-[#0f172a] text-white inline-flex items-center justify-center gap-1">
              <Plus className="w-3.5 h-3.5" /> 登记账号
            </button>
          </form>
          <div className="space-y-1.5 pt-2 border-t border-[#e2e8f0]">
            {(data?.accounts ?? []).map((a) => (
              <div key={a.id} className="p-2 rounded bg-[#f8fafc] border border-[#e2e8f0] flex justify-between items-center">
                <div>
                  <div className="font-medium text-[#0f172a]">{a.account_name}</div>
                  <div className="text-[10px] text-[#64748b]">{a.platform} {a.account_handle}</div>
                </div>
                <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px]">手动录入</span>
              </div>
            ))}
          </div>
        </div>

        {/* 录入真实发布表现 */}
        <form onSubmit={handleRecordMetric} className="lg:col-span-2 bg-white border border-[#e2e8f0] rounded-lg p-4 space-y-3">
          <h2 className="text-sm font-semibold text-[#0f172a]">录入发布表现数据快照（必须标明数据来源）</h2>
          <div>
            <label className="block text-[#475569] mb-1">选择已发布内容</label>
            <select value={pubId} onChange={(e) => setPubId(e.target.value)} className="w-full px-3 py-2 rounded border border-[#e2e8f0] bg-white">
              {(data?.publications ?? []).length === 0 && <option value="">暂无已发布记录（请先在发布中心确认已发布）</option>}
              {(data?.publications ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.platform}] {p.selected_title || p.topic} ({p.published_at})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[
              ['曝光/阅读', views, setViews],
              ['点赞', likes, setLikes],
              ['收藏', collects, setCollects],
              ['评论', comments, setComments],
              ['咨询量', inquiries, setInquiries],
              ['转化量', bookings, setBookings],
            ].map(([label, val, setter]) => (
              <div key={label as string}>
                <label className="block text-[11px] text-[#64748b] mb-0.5">{label as string}</label>
                <input
                  type="number"
                  min={0}
                  value={val as string}
                  onChange={(e) => (setter as (v: string) => void)(e.target.value)}
                  className="w-full px-2 py-1.5 rounded border border-[#e2e8f0]"
                />
              </div>
            ))}
          </div>
          <input
            required
            value={sourceLabel}
            onChange={(e) => setSourceLabel(e.target.value)}
            placeholder="数据来源说明 *"
            className="w-full px-3 py-1.5 rounded border border-[#e2e8f0]"
          />
          <button type="submit" className="px-4 py-2 rounded bg-[#0f172a] text-white font-medium">
            保存数据快照
          </button>

          {(data?.metrics ?? []).length > 0 && (
            <div className="pt-3 border-t border-[#e2e8f0] overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="border-b border-[#e2e8f0] text-[#64748b]">
                    <th className="py-1.5 pr-2">内容</th>
                    <th className="py-1.5 pr-2">阅读</th>
                    <th className="py-1.5 pr-2">收藏</th>
                    <th className="py-1.5 pr-2">咨询</th>
                    <th className="py-1.5 pr-2">转化</th>
                    <th className="py-1.5">来源说明</th>
                  </tr>
                </thead>
                <tbody>
                  {data!.metrics.map((m) => (
                    <tr key={m.id} className="border-b border-[#f1f5f9]">
                      <td className="py-1.5 pr-2 font-medium max-w-[180px] truncate">{m.topic}</td>
                      <td className="py-1.5 pr-2">{m.views}</td>
                      <td className="py-1.5 pr-2">{m.collects}</td>
                      <td className="py-1.5 pr-2">{m.inquiries}</td>
                      <td className="py-1.5 pr-2">{m.bookings}</td>
                      <td className="py-1.5 text-[#64748b]">{m.takeaway_note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </form>
      </div>

      {/* 复盘洞察与知识回流 */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-[#0f172a]">Agent 复盘洞察与知识回流 ({data?.insights.length ?? 0})</h2>
        {(data?.insights ?? []).map((ins) => {
          const actions: string[] = JSON.parse(ins.next_round_actions_json || '[]');
          return (
            <div key={ins.id} className="bg-white border border-[#e2e8f0] rounded-lg p-4 space-y-2.5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-[#0f172a]">复盘报告（样本数：{ins.sample_size}）· {ins.created_at}</span>
                {ins.synced_to_kb_doc_id ? (
                  <span className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 font-medium">已回流企业知识库</span>
                ) : (
                  <button onClick={() => handleSyncToKb(ins.id)} className="px-3 py-1 rounded bg-[#eff6ff] text-[#1d4ed8] font-medium inline-flex items-center gap-1">
                    <BookPlus className="w-3.5 h-3.5" /> 审核并回流企业知识库
                  </button>
                )}
              </div>
              <div className="p-2 rounded bg-amber-50 border border-amber-200 text-amber-800 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{ins.sample_warning}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[#475569]">
                <div><strong className="text-[#0f172a]">标题表现：</strong>{ins.title_finding}</div>
                <div><strong className="text-[#0f172a]">封面观察：</strong>{ins.cover_finding}</div>
                <div><strong className="text-[#0f172a]">持续主题：</strong>{ins.topic_finding}</div>
                <div><strong className="text-[#0f172a]">待优化项：</strong>{ins.weak_strategy_finding}</div>
              </div>
              <div className="pt-1 text-[#0f172a]">
                <strong>下轮优化动作：</strong> {actions.join('；')}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
