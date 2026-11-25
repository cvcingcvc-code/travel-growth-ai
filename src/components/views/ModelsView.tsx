'use client';

import React, { useEffect, useState } from 'react';
import { Cpu, Play, ShieldAlert } from 'lucide-react';

interface ProviderStatus {
  capability: 'text' | 'vision' | 'image' | 'embedding';
  provider: string;
  modelName: string;
  baseUrl: string;
  hasValidKey: boolean;
  allowTestMode: boolean;
  status: 'connected' | 'test_mode_ready' | 'unconfigured';
  statusNote: string;
}

interface ModelRun {
  id: string;
  capability: string;
  provider: string;
  model_name: string;
  task_type: string;
  status: string;
  duration_ms: number;
  total_tokens: number | null;
  error_message: string;
  created_at: string;
}

export function ModelsView({ orgId }: { orgId: string }) {
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [runs, setRuns] = useState<ModelRun[]>([]);
  const [testResult, setTestResult] = useState('');

  async function loadAll() {
    const res = await fetch('/api/v1/models', { headers: { 'x-organization-id': orgId } });
    const json = await res.json();
    if (json.ok) {
      setProviders(json.data.providers);
      setRuns(json.data.runs);
    }
  }

  useEffect(() => {
    loadAll();
  }, [orgId]);

  async function handleSaveProvider(p: ProviderStatus, updates: Partial<ProviderStatus>) {
    const next = { ...p, ...updates };
    const res = await fetch('/api/v1/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-organization-id': orgId },
      body: JSON.stringify({
        capability: next.capability,
        provider: next.provider,
        modelName: next.modelName,
        baseUrl: next.baseUrl,
        allowTestMode: next.allowTestMode,
      }),
    });
    if (res.ok) await loadAll();
  }

  async function handleTestConnection() {
    setTestResult('正在测试文本模型调用...');
    const res = await fetch('/api/v1/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-organization-id': orgId },
      body: JSON.stringify({ action: 'test_connection' }),
    });
    const json = await res.json();
    if (json.ok) {
      setTestResult(`调用成功（状态：${json.data.status}，耗时：${json.data.durationMs}ms）：${json.data.content}`);
    } else {
      setTestResult(`未配置或失败：${json.error?.message} — ${json.error?.guidance || ''}`);
    }
    await loadAll();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[#183a30]">统一模型配置中心</h1>
          <p className="text-xs text-[#53605a] mt-0.5">
            支持 OpenAI、Gemini、Claude、DeepSeek、Ollama 及兼容接口；密钥仅从环境变量读取，严禁明文入库。
          </p>
        </div>
        <button
          onClick={handleTestConnection}
          className="px-3.5 py-2 rounded bg-[#183a30] text-white text-xs font-medium inline-flex items-center gap-1.5"
        >
          <Play className="w-3.5 h-3.5" /> 测试文本模型连通性
        </button>
      </div>

      {testResult && (
        <div className="p-3 rounded bg-[#ebe6da] border border-[#d8cfb8] text-xs text-[#183a30] flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{testResult}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {providers.map((p) => (
          <div key={p.capability} className="bg-[#fcfbf8] border border-[#dfd9cb] rounded p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-sm text-[#183a30]">
                <Cpu className="w-4 h-4 text-[#4c7364]" />
                <span>能力类型：{p.capability.toUpperCase()}</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[11px] ${
                  p.status === 'connected'
                    ? 'bg-[#e3ede8] text-[#183a30]'
                    : p.status === 'test_mode_ready'
                    ? 'bg-[#ebe6da] text-[#8a6534]'
                    : 'bg-[#f4e5e1] text-[#b05b43]'
                }`}
              >
                {p.status === 'connected' ? '真实密钥已就绪' : p.status === 'test_mode_ready' ? '测试模式' : '未配置'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <select
                value={p.provider}
                onChange={(e) => handleSaveProvider(p, { provider: e.target.value })}
                className="px-2.5 py-1.5 rounded border border-[#dfd9cb] bg-white"
              >
                <option value="openai">OpenAI</option>
                <option value="gemini">Google Gemini</option>
                <option value="claude">Anthropic Claude</option>
                <option value="deepseek">DeepSeek</option>
                <option value="ollama">Ollama (本地)</option>
                <option value="lm_studio">LM Studio (本地)</option>
                <option value="vllm">vLLM (私有部署)</option>
                <option value="openai_compatible">OpenAI-Compatible</option>
              </select>
              <input
                value={p.modelName}
                onBlur={(e) => handleSaveProvider(p, { modelName: e.target.value })}
                onChange={(e) =>
                  setProviders((prev) =>
                    prev.map((x) => (x.capability === p.capability ? { ...x, modelName: e.target.value } : x))
                  )
                }
                placeholder="模型名称"
                className="px-2.5 py-1.5 rounded border border-[#dfd9cb] bg-white"
              />
            </div>

            <input
              value={p.baseUrl}
              onBlur={(e) => handleSaveProvider(p, { baseUrl: e.target.value })}
              onChange={(e) =>
                setProviders((prev) =>
                  prev.map((x) => (x.capability === p.capability ? { ...x, baseUrl: e.target.value } : x))
                )
              }
              placeholder="自定义 Base URL（可选，如 http://localhost:11434；非本机地址须配置鉴权）"
              className="w-full px-2.5 py-1.5 text-xs rounded border border-[#dfd9cb] bg-white"
            />

            <div className="flex items-center justify-between text-[11px] text-[#53605a]">
              <span>{p.statusNote}</span>
              <label className="flex items-center gap-1.5 shrink-0">
                <input
                  type="checkbox"
                  checked={p.allowTestMode}
                  onChange={(e) => handleSaveProvider(p, { allowTestMode: e.target.checked })}
                />
                <span>允许测试模式</span>
              </label>
            </div>
          </div>
        ))}
      </div>

      {/* 调用记录 */}
      <div className="bg-[#fcfbf8] border border-[#dfd9cb] rounded p-4 space-y-3">
        <h2 className="text-sm font-semibold text-[#183a30]">近期模型调用审计日志 (model_runs)</h2>
        {runs.length === 0 ? (
          <div className="text-xs text-[#7c8781] py-4 text-center">暂无模型调用记录。</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[#ebe6da] text-[#7c8781]">
                  <th className="py-2 pr-3">任务类型</th>
                  <th className="py-2 pr-3">供应商 / 模型</th>
                  <th className="py-2 pr-3">状态</th>
                  <th className="py-2 pr-3">耗时</th>
                  <th className="py-2 pr-3">Tokens</th>
                  <th className="py-2">时间</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id} className="border-b border-[#f0ece3]">
                    <td className="py-2 pr-3 font-medium">{r.task_type}</td>
                    <td className="py-2 pr-3">{r.provider} / {r.model_name}</td>
                    <td className="py-2 pr-3">{r.status}</td>
                    <td className="py-2 pr-3">{r.duration_ms} ms</td>
                    <td className="py-2 pr-3">{r.total_tokens ?? '-'}</td>
                    <td className="py-2 text-[#7c8781]">{r.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
