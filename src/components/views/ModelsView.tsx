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
          <h1 className="text-xl font-semibold text-[#1d4ed8]">统一模型配置中心</h1>
          <p className="text-xs text-[#475569] mt-0.5">
            支持 OpenAI、Gemini、Claude、DeepSeek、Ollama 及兼容接口；密钥仅从环境变量读取，严禁明文入库。
          </p>
        </div>
        <button
          onClick={handleTestConnection}
          className="px-3.5 py-2 rounded bg-[#1d4ed8] text-white text-xs font-medium inline-flex items-center gap-1.5"
        >
          <Play className="w-3.5 h-3.5" /> 测试文本模型连通性
        </button>
      </div>

      {testResult && (
        <div className="p-3 rounded bg-[#f1f5f9] border border-[#cbd5e1] text-xs text-[#1d4ed8] flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{testResult}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {providers.map((p) => (
          <div key={p.capability} className="bg-[#ffffff] border border-[#e2e8f0] rounded p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-sm text-[#1d4ed8]">
                <Cpu className="w-4 h-4 text-[#2563eb]" />
                <span>能力类型：{p.capability.toUpperCase()}</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[11px] ${
                  p.status === 'connected'
                    ? 'bg-[#eff6ff] text-[#1d4ed8]'
                    : p.status === 'test_mode_ready'
                    ? 'bg-[#f1f5f9] text-[#b45309]'
                    : 'bg-[#fef2f2] text-[#dc2626]'
                }`}
              >
                {p.status === 'connected' ? '真实密钥已就绪' : p.status === 'test_mode_ready' ? '测试模式' : '未配置'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <select
                value={p.provider}
                onChange={(e) => handleSaveProvider(p, { provider: e.target.value })}
                className="px-2.5 py-1.5 rounded border border-[#e2e8f0] bg-white"
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
                className="px-2.5 py-1.5 rounded border border-[#e2e8f0] bg-white"
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
              className="w-full px-2.5 py-1.5 text-xs rounded border border-[#e2e8f0] bg-white"
            />

            <div className="flex items-center justify-between text-[11px] text-[#475569]">
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
      <div className="bg-[#ffffff] border border-[#e2e8f0] rounded p-4 space-y-3">
        <h2 className="text-sm font-semibold text-[#1d4ed8]">近期模型调用审计日志 (model_runs)</h2>
        {runs.length === 0 ? (
          <div className="text-xs text-[#64748b] py-4 text-center">暂无模型调用记录。</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[#f1f5f9] text-[#64748b]">
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
                    <td className="py-2 text-[#64748b]">{r.created_at}</td>
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
