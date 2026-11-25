import { getDb } from '../db/client';
import { newId, requireOrgAccess } from '../db/tenant';
import type {
  AICapability,
  AIProviderId,
  ProviderCapabilityDeclaration,
  ProviderConfigRecord,
  ProviderRuntimeStatus,
  TextGenerationRequest,
  TextGenerationResult,
} from './types';
import { ProviderUnconfiguredError } from './types';

const DEFAULT_TIMEOUT_MS = 30000;

function getCapabilityDeclaration(provider: AIProviderId): ProviderCapabilityDeclaration {
  switch (provider) {
    case 'openai':
    case 'gemini':
      return {
        supportsText: true,
        supportsVision: true,
        supportsImage: provider === 'openai',
        supportsEmbedding: true,
        supportsJsonMode: true,
        requiresAuthToken: true,
      };
    case 'claude':
    case 'deepseek':
      return {
        supportsText: true,
        supportsVision: provider === 'claude',
        supportsImage: false,
        supportsEmbedding: false,
        supportsJsonMode: true,
        requiresAuthToken: true,
      };
    case 'ollama':
    case 'lm_studio':
    case 'vllm':
    case 'openai_compatible':
      return {
        supportsText: true,
        supportsVision: false,
        supportsImage: false,
        supportsEmbedding: true,
        supportsJsonMode: true,
        requiresAuthToken: provider === 'openai_compatible',
      };
  }
}

export function validateLocalEndpointSecurity(provider: AIProviderId, baseUrl: string) {
  if (!baseUrl) return;
  if (provider === 'ollama' || provider === 'lm_studio' || provider === 'vllm') {
    const u = new URL(baseUrl);
    const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(u.hostname);
    if (!isLocalHost && !process.env.LOCAL_MODEL_AUTH_TOKEN) {
      throw new Error(
        `安全拦截：禁止将无认证的本地模型服务 (${provider}) 暴露到非本机公网地址 ${u.hostname}，请先配置内网鉴权或 LOCAL_MODEL_AUTH_TOKEN。`
      );
    }
  }
}

function hasEnvCredential(provider: AIProviderId, baseUrl?: string): { hasKey: boolean; note: string } {
  switch (provider) {
    case 'openai':
      return process.env.OPENAI_API_KEY
        ? { hasKey: true, note: '已检测到 OPENAI_API_KEY' }
        : { hasKey: false, note: '未配置 OPENAI_API_KEY' };
    case 'gemini':
      return process.env.GEMINI_API_KEY
        ? { hasKey: true, note: '已检测到 GEMINI_API_KEY' }
        : { hasKey: false, note: '未配置 GEMINI_API_KEY' };
    case 'claude':
      return process.env.ANTHROPIC_API_KEY
        ? { hasKey: true, note: '已检测到 ANTHROPIC_API_KEY' }
        : { hasKey: false, note: '未配置 ANTHROPIC_API_KEY' };
    case 'deepseek':
      return process.env.DEEPSEEK_API_KEY
        ? { hasKey: true, note: '已检测到 DEEPSEEK_API_KEY' }
        : { hasKey: false, note: '未配置 DEEPSEEK_API_KEY' };
    case 'ollama':
      return process.env.OLLAMA_BASE_URL || baseUrl
        ? { hasKey: true, note: `已配置 Ollama 地址 ${baseUrl || process.env.OLLAMA_BASE_URL}` }
        : { hasKey: false, note: '未配置 OLLAMA_BASE_URL（如 http://localhost:11434）' };
    case 'lm_studio':
      return process.env.LM_STUDIO_BASE_URL || baseUrl
        ? { hasKey: true, note: `已配置 LM Studio 地址 ${baseUrl || process.env.LM_STUDIO_BASE_URL}` }
        : { hasKey: false, note: '未配置 LM_STUDIO_BASE_URL（如 http://localhost:1234/v1）' };
    case 'vllm':
      return process.env.VLLM_BASE_URL || baseUrl
        ? { hasKey: true, note: `已配置 vLLM 地址 ${baseUrl || process.env.VLLM_BASE_URL}` }
        : { hasKey: false, note: '未配置 VLLM_BASE_URL（如 http://localhost:8000/v1）' };
    case 'openai_compatible':
      return process.env.OPENAI_API_KEY && (baseUrl || process.env.OPENAI_BASE_URL)
        ? { hasKey: true, note: '已检测到 OpenAI-compatible 凭据' }
        : { hasKey: false, note: '未配置兼容接口 OPENAI_API_KEY / Base URL' };
    default:
      return { hasKey: false, note: '未知模型供应商' };
  }
}

export function getProviderStatuses(organizationId: string): ProviderRuntimeStatus[] {
  requireOrgAccess(organizationId);
  const db = getDb();
  const rows = db
    .prepare('SELECT * FROM provider_configs WHERE organization_id = ?')
    .all(organizationId) as unknown as ProviderConfigRecord[];

  const capabilities: AICapability[] = ['text', 'vision', 'image', 'embedding'];
  return capabilities.map((cap) => {
    const row = rows.find((r) => r.capability === cap);
    const provider: AIProviderId = row?.provider ?? 'openai';
    const modelName =
      row?.model_name ??
      (cap === 'text'
        ? process.env.AI_DEFAULT_TEXT_MODEL || 'gpt-4o-mini'
        : cap === 'image'
        ? 'dall-e-3'
        : cap === 'embedding'
        ? 'text-embedding-3-small'
        : 'gpt-4o-mini');
    const allowTestMode = row ? Boolean(row.allow_test_mode) : true;
    const baseUrl = row?.base_url ?? '';
    const cred = hasEnvCredential(provider, baseUrl);

    let status: ProviderRuntimeStatus['status'] = 'unconfigured';
    if (cred.hasKey) status = 'connected';
    else if (allowTestMode) status = 'test_mode_ready';

    return {
      capability: cap,
      provider,
      modelName,
      baseUrl,
      timeoutMs: DEFAULT_TIMEOUT_MS,
      hasValidKey: cred.hasKey,
      allowTestMode,
      status,
      statusNote: cred.hasKey
        ? cred.note
        : `${cred.note}${allowTestMode ? '（已启用明确标记的测试模式）' : '（请配置密钥或开启测试模式）'}`,
      capabilities: getCapabilityDeclaration(provider),
    };
  });
}

export function updateProviderConfig(params: {
  organizationId: string;
  capability: AICapability;
  provider: AIProviderId;
  modelName: string;
  baseUrl?: string;
  allowTestMode: boolean;
}) {
  requireOrgAccess(params.organizationId);
  if (params.baseUrl) {
    validateLocalEndpointSecurity(params.provider, params.baseUrl);
  }
  const db = getDb();
  db.prepare(
    `INSERT INTO provider_configs (id, organization_id, capability, provider, model_name, base_url, allow_test_mode, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(organization_id, capability) DO UPDATE SET
       provider = excluded.provider,
       model_name = excluded.model_name,
       base_url = excluded.base_url,
       allow_test_mode = excluded.allow_test_mode,
       updated_at = datetime('now')`
  ).run(
    newId('pc'),
    params.organizationId,
    params.capability,
    params.provider,
    params.modelName,
    params.baseUrl ?? '',
    params.allowTestMode ? 1 : 0
  );
  return getProviderStatuses(params.organizationId);
}

export function recordModelRun(params: {
  organizationId: string;
  capability: AICapability;
  provider: string;
  modelName: string;
  taskType: string;
  status: 'success' | 'test_mode' | 'error' | 'unconfigured';
  durationMs: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  errorMessage?: string;
}) {
  const db = getDb();
  db.prepare(
    `INSERT INTO model_runs (id, organization_id, capability, provider, model_name, task_type, status, duration_ms, prompt_tokens, completion_tokens, total_tokens, error_message)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    newId('mrun'),
    params.organizationId,
    params.capability,
    params.provider,
    params.modelName,
    params.taskType,
    params.status,
    params.durationMs,
    params.promptTokens ?? null,
    params.completionTokens ?? null,
    params.totalTokens ?? null,
    params.errorMessage ?? ''
  );
}

async function callRealTextModel(
  status: ProviderRuntimeStatus,
  req: TextGenerationRequest
): Promise<{ content: string; usage?: TextGenerationResult['usage'] }> {
  const { provider, modelName, baseUrl } = status;
  const signal = AbortSignal.timeout(req.timeoutMs ?? status.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  if (
    provider === 'openai' ||
    provider === 'deepseek' ||
    provider === 'openai_compatible' ||
    provider === 'lm_studio' ||
    provider === 'vllm'
  ) {
    const apiKey =
      provider === 'deepseek'
        ? process.env.DEEPSEEK_API_KEY
        : provider === 'lm_studio' || provider === 'vllm'
        ? process.env.LOCAL_MODEL_AUTH_TOKEN || 'local-dev-token'
        : process.env.OPENAI_API_KEY;
    const endpointBase =
      baseUrl ||
      (provider === 'deepseek'
        ? process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1'
        : provider === 'lm_studio'
        ? process.env.LM_STUDIO_BASE_URL || 'http://localhost:1234/v1'
        : provider === 'vllm'
        ? process.env.VLLM_BASE_URL || 'http://localhost:8000/v1'
        : process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1');

    validateLocalEndpointSecurity(provider, endpointBase);

    const res = await fetch(`${endpointBase.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        temperature: req.temperature ?? 0.5,
        messages: [
          { role: 'system', content: req.systemPrompt },
          { role: 'user', content: req.userPrompt },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };
    return {
      content: data.choices?.[0]?.message?.content ?? '',
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
    };
  }

  if (provider === 'gemini') {
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      modelName
    )}:generateContent?key=${encodeURIComponent(apiKey || '')}`;

    const res = await fetch(url, {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: req.systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: req.userPrompt }] }],
        generationConfig: { temperature: req.temperature ?? 0.5 },
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini HTTP ${res.status}: ${errText.slice(0, 200)}`);
    }
    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
      };
    };
    return {
      content: data.candidates?.[0]?.content?.parts?.[0]?.text ?? '',
      usage: data.usageMetadata
        ? {
            promptTokens: data.usageMetadata.promptTokenCount,
            completionTokens: data.usageMetadata.candidatesTokenCount,
            totalTokens: data.usageMetadata.totalTokenCount,
          }
        : undefined,
    };
  }

  if (provider === 'claude') {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: modelName,
        max_tokens: 2048,
        system: req.systemPrompt,
        messages: [{ role: 'user', content: req.userPrompt }],
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Claude HTTP ${res.status}: ${errText.slice(0, 200)}`);
    }
    const data = (await res.json()) as {
      content?: Array<{ text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const pt = data.usage?.input_tokens;
    const ct = data.usage?.output_tokens;
    return {
      content: data.content?.[0]?.text ?? '',
      usage:
        pt !== undefined || ct !== undefined
          ? { promptTokens: pt, completionTokens: ct, totalTokens: (pt ?? 0) + (ct ?? 0) }
          : undefined,
    };
  }

  if (provider === 'ollama') {
    const endpoint = baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    validateLocalEndpointSecurity('ollama', endpoint);
    const res = await fetch(`${endpoint.replace(/\/$/, '')}/api/chat`, {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelName,
        stream: false,
        messages: [
          { role: 'system', content: req.systemPrompt },
          { role: 'user', content: req.userPrompt },
        ],
      }),
    });
    if (!res.ok) {
      throw new Error(`Ollama HTTP ${res.status}`);
    }
    const data = (await res.json()) as { message?: { content?: string } };
    return { content: data.message?.content ?? '' };
  }

  throw new Error(`不支持的模型供应商: ${provider}`);
}

export async function generateTextWithRegistry(
  req: TextGenerationRequest
): Promise<TextGenerationResult> {
  const started = Date.now();
  const statuses = getProviderStatuses(req.organizationId);
  const textStatus = statuses.find((s) => s.capability === 'text')!;

  if (textStatus.hasValidKey) {
    try {
      const res = await callRealTextModel(textStatus, req);
      const durationMs = Date.now() - started;
      recordModelRun({
        organizationId: req.organizationId,
        capability: 'text',
        provider: textStatus.provider,
        modelName: textStatus.modelName,
        taskType: req.taskType,
        status: 'success',
        durationMs,
        promptTokens: res.usage?.promptTokens,
        completionTokens: res.usage?.completionTokens,
        totalTokens: res.usage?.totalTokens,
      });
      return {
        content: res.content,
        provider: textStatus.provider,
        modelName: textStatus.modelName,
        status: 'success',
        dataOrigin: 'real',
        durationMs,
        usage: res.usage,
      };
    } catch (err) {
      const durationMs = Date.now() - started;
      const msg = err instanceof Error ? err.message : '未知模型调用异常';
      recordModelRun({
        organizationId: req.organizationId,
        capability: 'text',
        provider: textStatus.provider,
        modelName: textStatus.modelName,
        taskType: req.taskType,
        status: 'error',
        durationMs,
        errorMessage: msg,
      });
      throw err;
    }
  }

  if (!textStatus.allowTestMode || !req.testModeFallback) {
    const durationMs = Date.now() - started;
    recordModelRun({
      organizationId: req.organizationId,
      capability: 'text',
      provider: textStatus.provider,
      modelName: textStatus.modelName,
      taskType: req.taskType,
      status: 'unconfigured',
      durationMs,
      errorMessage: textStatus.statusNote,
    });
    throw new ProviderUnconfiguredError(
      `文本模型未配置 (${textStatus.provider} / ${textStatus.modelName})`,
      '请在 .env.local 中配置有效的模型 API Key（或 Ollama/LM Studio/vLLM 本地地址），或在「模型配置中心」开启测试模式。'
    );
  }

  const content = req.testModeFallback();
  const durationMs = Date.now() - started;
  recordModelRun({
    organizationId: req.organizationId,
    capability: 'text',
    provider: `${textStatus.provider} (test_mode)`,
    modelName: textStatus.modelName,
    taskType: req.taskType,
    status: 'test_mode',
    durationMs,
  });

  return {
    content,
    provider: textStatus.provider,
    modelName: textStatus.modelName,
    status: 'test_mode',
    dataOrigin: 'test_mode',
    durationMs,
  };
}
