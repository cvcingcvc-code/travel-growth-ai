'use client';

import React, { useEffect, useState } from 'react';
import { Bot, CheckCircle2, Play, RotateCcw, Save, ShieldCheck, XCircle } from 'lucide-react';

interface AgentConfig {
  id: string;
  agent_name: string;
  company_background: string;
  brand_rules: string;
  product_customer_profile: string;
  marketing_goals: string;
  enabled_tools_json: string;
  review_rules_json: string;
  logical_roles_json: string;
  experience_memory_json: string;
  status: string;
  updated_at: string;
}

interface ExecutionStep {
  id: string;
  run_id: string;
  step_index: number;
  role_name: string;
  tool_name: string;
  input_summary: string;
  output_summary: string;
  status: string;
  error_message: string;
  duration_ms: number;
  created_at: string;
}

export function AgentView({ orgId }: { orgId: string }) {
  const [agent, setAgent] = useState<AgentConfig | null>(null);
  const [steps, setSteps] = useState<ExecutionStep[]>([]);
  const [objective, setObjective] = useState('梳理当前企业知识库与产品卖点，检查待核实风险并给出本周小红书重点选题建议');
  const [editGoals, setEditGoals] = useState('');
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  async function loadAgent() {
    const res = await fetch('/api/v1/agent-profile', { headers: { 'x-organization-id': orgId } });
    const json = await res.json();
    if (json.ok) {
      setAgent(json.data.agent);
      setSteps(json.data.steps);
      setEditGoals(json.data.agent.marketing_goals || '');
    }
  }

  useEffect(() => {
    loadAgent();
  }, [orgId]);

  async function handleRunOrchestrator(e?: React.FormEvent) {
    e?.preventDefault();
    setRunning(true);
    setNotice('');
    try {
      const res = await fetch('/api/v1/agent-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-organization-id': orgId },
        body: JSON.stringify({ objective }),
      });
      const json = await res.json();
      if (json.ok) {
        setAgent(json.data.agent);
        setSteps(json.data.steps);
        setNotice(`总控编排执行完成（Run ID: ${json.data.runId}），所有真实工具调用与耗时已落盘。`);
      } else {
        setNotice(`执行失败：${json.error?.message}`);
      }
    } finally {
      setRunning(false);
    }
  }

  async function handleSaveConfig() {
    setSaving(true);
    try {
      const res = await fetch('/api/v1/agent-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-organization-id': orgId },
        body: JSON.stringify({ marketingGoals: editGoals }),
      });
      if (res.ok) {
        setNotice('专属 Agent 营销目标已持久化更新。');
        await loadAgent();
      }
    } finally {
      setSaving(false);
    }
  }

  if (!agent) {
    return <div className="p-8 text-center text-xs text-[#64748b] bg-white border border-[#e2e8f0] rounded-lg">正在加载企业专属营销 Agent...</div>;
  }

  const roles: Array<{ id: string; name: string; duty: string }> = JSON.parse(agent.logical_roles_json || '[]');
  const reviewRules: string[] = JSON.parse(agent.review_rules_json || '[]');
  const memory: string[] = JSON.parse(agent.experience_memory_json || '[]');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[#0f172a] flex items-center gap-2">
            <Bot className="w-5 h-5 text-[#1d4ed8]" />
            {agent.agent_name}
          </h1>
          <p className="text-xs text-[#64748b] mt-0.5">
            由统一 Orchestrator 调度 8 大逻辑角色与真实工具接口，所有步骤、输入输出与耗时均真实落盘。
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          状态：{agent.status === 'ready' ? '已就绪' : agent.status}
        </span>
      </div>

      {notice && <div className="p-3 rounded-md bg-[#eff6ff] border border-[#bfdbfe] text-xs text-[#1e40af]">{notice}</div>}

      {/* 总控任务触发栏 */}
      <form onSubmit={handleRunOrchestrator} className="bg-white border border-[#e2e8f0] rounded-lg p-4 flex flex-col sm:flex-row gap-3">
        <input
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          placeholder="输入营销任务目标，交由总控 Agent 拆解并调度工具执行..."
          className="flex-1 px-3 py-2 text-xs rounded-md border border-[#e2e8f0] bg-[#f8fafc] focus:bg-white focus:outline-none focus:border-[#2563eb]"
        />
        <button
          type="submit"
          disabled={running}
          className="px-4 py-2 rounded-md bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-medium inline-flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-60"
        >
          <Play className="w-3.5 h-3.5" />
          {running ? '编排执行中...' : '运行总控 Agent 诊断'}
        </button>
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 左侧：持久化 Agent 配置与记忆 */}
        <div className="space-y-4">
          <div className="bg-white border border-[#e2e8f0] rounded-lg p-4 space-y-3 text-xs">
            <h2 className="text-sm font-semibold text-[#0f172a]">企业身份与配置</h2>
            <div className="text-[#475569] leading-relaxed">{agent.company_background}</div>
            <div>
              <div className="font-medium text-[#0f172a] mb-1">产品与客群画像</div>
              <div className="text-[#475569]">{agent.product_customer_profile}</div>
            </div>
            <div>
              <div className="font-medium text-[#0f172a] mb-1">营销目标（可编辑）</div>
              <textarea rows={2} value={editGoals} onChange={(e) => setEditGoals(e.target.value)} className="w-full p-2 rounded border border-[#e2e8f0] bg-[#f8fafc]" />
              <button onClick={handleSaveConfig} disabled={saving} className="mt-1.5 px-3 py-1 rounded bg-[#0f172a] text-white inline-flex items-center gap-1">
                <Save className="w-3 h-3" /> 保存目标
              </button>
            </div>
            <div>
              <div className="font-medium text-[#0f172a] mb-1 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#1d4ed8]" /> 审核与安全红线
              </div>
              <ul className="list-disc list-inside text-[#475569] space-y-1">
                {reviewRules.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          </div>

          <div className="bg-white border border-[#e2e8f0] rounded-lg p-4 space-y-2 text-xs">
            <h2 className="text-sm font-semibold text-[#0f172a]">复盘经验记忆 ({memory.length})</h2>
            {memory.length === 0 ? (
              <div className="text-[#94a3b8]">暂无回流经验，在「数据复盘」确认回流后将自动沉淀至此。</div>
            ) : (
              memory.map((m, i) => <div key={i} className="p-2 rounded bg-[#f8fafc] border border-[#e2e8f0] text-[#475569]">{m}</div>)
            )}
          </div>
        </div>

        {/* 右侧：8 大逻辑角色 + 真实执行步骤可视化 */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white border border-[#e2e8f0] rounded-lg p-4 space-y-3">
            <h2 className="text-sm font-semibold text-[#0f172a]">8 大逻辑角色（统一 Orchestrator 调度）</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
              {roles.map((r) => (
                <div key={r.id} className="p-2.5 rounded-md bg-[#f8fafc] border border-[#e2e8f0]">
                  <div className="font-semibold text-[#1d4ed8]">{r.name}</div>
                  <div className="text-[11px] text-[#64748b] mt-1 leading-relaxed">{r.duty}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-[#e2e8f0] rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#0f172a]">真实执行步骤与工具调用日志 ({steps.length})</h2>
              <button onClick={() => handleRunOrchestrator()} className="text-xs text-[#1d4ed8] inline-flex items-center gap-1 hover:underline">
                <RotateCcw className="w-3 h-3" /> 重新执行
              </button>
            </div>
            {steps.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#94a3b8]">尚未执行编排任务，点击上方「运行总控 Agent 诊断」立即观察真实工具调用轨迹。</div>
            ) : (
              <div className="space-y-2">
                {steps.map((s) => (
                  <div key={s.id} className="p-3 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-xs space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {s.status === 'completed' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                        )}
                        <span className="font-semibold text-[#0f172a]">Step {s.step_index} · {s.role_name}</span>
                        <code className="px-1.5 py-0.5 rounded bg-white border border-[#e2e8f0] text-[10px] text-[#1d4ed8]">{s.tool_name}</code>
                      </div>
                      <span className="text-[11px] text-[#64748b]">{s.duration_ms}ms · {s.created_at}</span>
                    </div>
                    <div className="text-[#475569]"><strong>输入：</strong>{s.input_summary}</div>
                    <div className="text-[#0f172a]"><strong>输出：</strong>{s.output_summary}</div>
                    {s.error_message && <div className="text-red-600">错误：{s.error_message}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
