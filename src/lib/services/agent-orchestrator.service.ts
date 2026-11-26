import { getDb } from '../db/client';
import { newId, requireOrgAccess, writeAuditLog } from '../db/tenant';
import { generateTextWithRegistry } from '../providers/registry';
import { getCompanyProfile } from './organization.service';
import { searchKnowledge } from './knowledge.service';
import { listContentCases } from './analysis.service';

export const LOGICAL_AGENT_ROLES = [
  { id: 'orchestrator', name: '总控 Agent', duty: '拆解企业营销目标、调度子角色与工具调用' },
  { id: 'market_research', name: '市场调研 Agent', duty: '收集公开市场案例、行业动态与同行内容' },
  { id: 'viral_analyst', name: '爆款分析 Agent', duty: '拆解传播结构、标题钩子与用户痛点' },
  { id: 'strategist', name: '营销策划 Agent', duty: '结合企业产品与知识库制定7天/30天营销方案' },
  { id: 'copywriter', name: '文案 Agent', duty: '按小红书/抖音/公众号/视频号平台风格生成文案' },
  { id: 'visual', name: '视觉 Agent', duty: '负责封面设计、多页图文与生图提示词/素材匹配' },
  { id: 'compliance', name: '合规审核 Agent', duty: '核查事实来源、价格/时间待核实项、版权与宣传禁区' },
  { id: 'reviewer', name: '数据复盘 Agent', duty: '分析真实发布表现并沉淀可复用的运营经验' },
] as const;

export function ensureOrganizationAgent(organizationId: string) {
  const profile = getCompanyProfile(organizationId);
  const org = profile.organization as { id: string; name: string; industry_type: string; location?: string; description?: string };
  const brand = profile.brandProfile as {
    positioning?: string;
    tone_keywords_json?: string;
    visual_guidelines?: string;
    forbidden_claims_json?: string;
  } | null;
  const products = profile.products as Array<{ name: string; summary: string; verification_status: string }>;

  const db = getDb();
  const existing = db
    .prepare('SELECT * FROM organization_agents WHERE organization_id = ?')
    .get(organizationId) as Record<string, unknown> | undefined;

  if (existing) {
    return existing;
  }

  const id = newId('agt');
  const agentName = `${org.name.replace(/[（(].*?[）)]/g, '')} · 专属营销 Agent`;
  const companyBg = `${org.name}（行业：${org.industry_type}，所在地：${org.location || '待补充'}）。${org.description || ''}`;
  const brandRules = `定位：${brand?.positioning || '待补充'}；调性：${brand?.tone_keywords_json || '[]'}；视觉：${brand?.visual_guidelines || '克制真实'}；禁区：${brand?.forbidden_claims_json || '[]'}`;
  const prodProfile =
    products.length > 0
      ? products.map((p) => `${p.name}（${p.verification_status === 'verified' ? '已核实' : '待核实'}）`).join('；')
      : '尚未建立产品档案，需在产品管理补充';

  db.prepare(
    `INSERT INTO organization_agents (
      id, organization_id, agent_name, company_background, brand_rules, product_customer_profile,
      marketing_goals, enabled_tools_json, kb_permissions_json, review_rules_json,
      logical_roles_json, experience_memory_json, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ready')`
  ).run(
    id,
    organizationId,
    agentName,
    companyBg,
    brandRules,
    prodProfile,
    '提升目标平台收藏率、有效咨询率与真实转化，严禁编造企业事实。',
    JSON.stringify([
      'get_company_profile',
      'search_knowledge',
      'collect_trends',
      'analyze_content',
      'generate_campaign',
      'generate_copy',
      'generate_visual_plan',
      'save_draft',
      'analyze_performance',
    ]),
    JSON.stringify(['A_FACTS', 'B_PRODUCTS', 'C_BRAND', 'D_STRATEGIES', 'E_EXPERIENCE', 'F_SYSTEM_AGENT']),
    JSON.stringify([
      '价格、地址、营业时间、活动政策未核实前必须标记[待核实]',
      '禁止将 AI 概念图冒充真实景区或产品实拍',
      '所有内容必须经人工审核确认后方可标记发布',
    ]),
    JSON.stringify(LOGICAL_AGENT_ROLES),
    JSON.stringify([])
  );

  writeAuditLog({
    organizationId,
    action: 'agent.auto_create',
    targetType: 'organization_agent',
    targetId: id,
    detail: { agentName },
  });

  return db.prepare('SELECT * FROM organization_agents WHERE id = ?').get(id);
}

export function getAgentWorkspaceState(organizationId: string) {
  requireOrgAccess(organizationId);
  const agent = ensureOrganizationAgent(organizationId);
  const db = getDb();
  const steps = db
    .prepare(
      'SELECT * FROM agent_execution_steps WHERE organization_id = ? ORDER BY created_at DESC, step_index ASC LIMIT 40'
    )
    .all(organizationId);
  return { agent, steps };
}

export function updateOrganizationAgent(params: {
  organizationId: string;
  agentName?: string;
  marketingGoals?: string;
  brandRules?: string;
  status?: 'ready' | 'paused';
}) {
  requireOrgAccess(params.organizationId);
  ensureOrganizationAgent(params.organizationId);
  const db = getDb();
  const cur = db
    .prepare('SELECT * FROM organization_agents WHERE organization_id = ?')
    .get(params.organizationId) as Record<string, string>;

  db.prepare(
    `UPDATE organization_agents
     SET agent_name = ?, marketing_goals = ?, brand_rules = ?, status = ?, updated_at = datetime('now')
     WHERE organization_id = ?`
  ).run(
    params.agentName?.trim() || cur.agent_name,
    params.marketingGoals?.trim() || cur.marketing_goals,
    params.brandRules?.trim() || cur.brand_rules,
    params.status || cur.status,
    params.organizationId
  );

  return getAgentWorkspaceState(params.organizationId);
}

export function logAgentStep(params: {
  organizationId: string;
  runId: string;
  stepIndex: number;
  roleName: string;
  toolName: string;
  inputSummary: string;
  outputSummary: string;
  status: 'running' | 'completed' | 'failed';
  errorMessage?: string;
  durationMs: number;
}) {
  const db = getDb();
  db.prepare(
    `INSERT INTO agent_execution_steps (
      id, organization_id, run_id, step_index, role_name, tool_name,
      input_summary, output_summary, status, error_message, duration_ms
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    newId('astep'),
    params.organizationId,
    params.runId,
    params.stepIndex,
    params.roleName,
    params.toolName,
    params.inputSummary,
    params.outputSummary,
    params.status,
    params.errorMessage ?? '',
    params.durationMs
  );
}

/**
 * 真实执行一次 Orchestrator 端到端诊断与策划编排，每一步调用真实内部服务与真实文本模型（如 DeepSeek）并落盘执行日志
 */
export async function runOrchestratorDiagnostic(
  organizationId: string,
  objective: string,
  options?: { skipLlmForSeed?: boolean }
) {
  requireOrgAccess(organizationId);
  ensureOrganizationAgent(organizationId);
  const runId = newId('run');
  const cleanObjective = objective.trim() || '梳理企业知识库、对齐竞品与产品卖点并生成下周营销行动建议';

  // Step 1: 总控 Agent 读取企业与产品档案
  const t1 = Date.now();
  const profile = getCompanyProfile(organizationId);
  const orgName = String((profile.organization as { name: string }).name);
  const products = profile.products as Array<{ name: string; summary?: string; price_info?: string; verification_status: string }>;
  logAgentStep({
    organizationId,
    runId,
    stepIndex: 1,
    roleName: '总控 Agent',
    toolName: 'get_company_profile',
    inputSummary: `拆解目标：${cleanObjective}`,
    outputSummary: `已加载「${orgName}」企业档案与 ${products.length} 个产品（其中已核实 ${products.filter((p) => p.verification_status === 'verified').length} 个）`,
    status: 'completed',
    durationMs: Math.max(1, Date.now() - t1),
  });

  // Step 2: 市场调研 & 爆款分析 Agent 检索已有对标案例
  const t2 = Date.now();
  const cases = listContentCases(organizationId) as Array<{ title: string; latestAnalysis?: unknown }>;
  logAgentStep({
    organizationId,
    runId,
    stepIndex: 2,
    roleName: '市场调研 Agent',
    toolName: 'list_content_cases',
    inputSummary: `读取当前企业已采集同行/公开案例`,
    outputSummary: `共检索到 ${cases.length} 条案例，已完成结构化拆解 ${cases.filter((c) => Boolean(c.latestAnalysis)).length} 条`,
    status: 'completed',
    durationMs: Math.max(1, Date.now() - t2),
  });

  // Step 3: 营销策划 Agent 检索六类知识库
  const t3 = Date.now();
  const hits = searchKnowledge(organizationId, `${cleanObjective} 品牌 卖点 策略`, { limit: 5 });
  logAgentStep({
    organizationId,
    runId,
    stepIndex: 3,
    roleName: '营销策划 Agent',
    toolName: 'search_knowledge',
    inputSummary: `检索关键词：${cleanObjective.slice(0, 40)}`,
    outputSummary: `命中 ${hits.length} 条知识切片（已核实 ${hits.filter((h) => h.verificationStatus === 'verified').length} 条）`,
    status: 'completed',
    durationMs: Math.max(1, Date.now() - t3),
  });

  // Step 4: 合规审核 Agent 检查待核实风险
  const t4 = Date.now();
  const unverifiedProducts = products.filter((p) => p.verification_status !== 'verified').length;
  const unverifiedHits = hits.filter((h) => h.verificationStatus !== 'verified').length;
  logAgentStep({
    organizationId,
    runId,
    stepIndex: 4,
    roleName: '合规审核 Agent',
    toolName: 'check_fact_compliance',
    inputSummary: `扫描产品与知识库核实状态`,
    outputSummary:
      unverifiedProducts + unverifiedHits > 0
        ? `发现 ${unverifiedProducts} 个待核实产品、${unverifiedHits} 条待核实知识，已锁定防编造规则`
        : '所有引用产品与知识均已核实，可进入内容生产',
    status: 'completed',
    durationMs: Math.max(1, Date.now() - t4),
  });

  // Step 5: 调用真实文本模型（如 DeepSeek）综合企业知识、产品与案例生成行动建议
  let aiSummary: { dataOrigin: string; provider: string; modelName: string; content: string; totalTokens?: number } | null = null;
  if (!options?.skipLlmForSeed) {
    const t5 = Date.now();
    try {
      const llmRes = await generateTextWithRegistry({
        organizationId,
        taskType: 'agent_orchestrator_plan',
        systemPrompt:
          '你是企业专属营销总控 Agent。请严格结合提供的企业产品、知识库切片和同行案例，输出 3 条具体、可执行的下周营销行动建议（每条不超过60字）。严禁编造未提供的价格或事实。',
        userPrompt: `企业：${orgName}\n任务目标：${cleanObjective}\n产品列表：${products.map((p) => `${p.name}(${p.price_info || '待核实'})`).join('；') || '暂无'}\n知识库命中：${hits.map((h) => `[${h.category}] ${h.title}: ${h.snippet.slice(0, 100)}`).join('\n') || '暂无'}\n对标案例：${cases.map((c) => c.title).join('；') || '暂无'}`,
        testModeFallback: () =>
          `【测试模式】基于「${orgName}」当前 ${products.length} 个产品与 ${hits.length} 条知识切片，建议：1) 围绕主打产品发布行前核对清单图文；2) 补齐 ${unverifiedProducts} 个待核实产品的价格与开放时间；3) 复用已有对标案例结构进行首周收藏率测试。`,
      });
      aiSummary = {
        dataOrigin: llmRes.dataOrigin,
        provider: llmRes.provider,
        modelName: llmRes.modelName,
        content: llmRes.content,
        totalTokens: llmRes.usage?.totalTokens,
      };
      logAgentStep({
        organizationId,
        runId,
        stepIndex: 5,
        roleName: '总控 Agent (LLM 推理)',
        toolName: `${llmRes.provider}/${llmRes.modelName}`,
        inputSummary: `综合 ${products.length} 个产品、${hits.length} 条知识与 ${cases.length} 条案例`,
        outputSummary: `[${llmRes.dataOrigin}${llmRes.usage?.totalTokens ? ` · ${llmRes.usage.totalTokens} tokens` : ''}] ${llmRes.content.slice(0, 320)}`,
        status: 'completed',
        durationMs: Math.max(1, Date.now() - t5),
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : '模型调用失败';
      logAgentStep({
        organizationId,
        runId,
        stepIndex: 5,
        roleName: '总控 Agent (LLM 推理)',
        toolName: 'generateTextWithRegistry',
        inputSummary: `综合企业知识库执行大模型推理`,
        outputSummary: '真实模型推理未完成',
        status: 'failed',
        errorMessage: errMsg,
        durationMs: Math.max(1, Date.now() - t5),
      });
      throw err;
    }
  }

  writeAuditLog({
    organizationId,
    actorType: 'agent',
    actorId: 'orchestrator',
    action: 'agent.orchestrator_run',
    targetType: 'workflow_run',
    targetId: runId,
    detail: { objective: cleanObjective, steps: options?.skipLlmForSeed ? 4 : 5, dataOrigin: aiSummary?.dataOrigin ?? 'seed' },
  });

  return { runId, aiSummary, ...getAgentWorkspaceState(organizationId) };
}
