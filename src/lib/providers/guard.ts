import { getDb } from '../db/client';

export class AIRateLimitError extends Error {
  code: string;
  statusCode = 429;
  guidance: string;

  constructor(code: 'RATE_LIMITED' | 'BUDGET_LIMIT_EXCEEDED' | 'AI_PASSCODE_REQUIRED', message: string, statusCode = 429) {
    super(message);
    this.name = 'AIRateLimitError';
    this.code = code;
    this.statusCode = statusCode;
    this.guidance =
      code === 'AI_PASSCODE_REQUIRED'
        ? '当前环境已开启 AI 调用口令保护，请在请求头携带有效的 X-AI-Passcode。'
        : '已触发安全限流或每日费用熔断保护，请稍后再试或在环境变量调整 AI_RATE_LIMIT_PER_MIN / AI_DAILY_MAX_TOKENS。';
  }
}

// 进程内滑动窗口限流（每组织每分钟最大调用次数）
const minuteBuckets = new Map<string, number[]>();

export function enforceAIGuards(params: { organizationId: string; passcode?: string | null }) {
  // 1. 可选访问口令保护
  const requiredPasscode = process.env.AI_ACCESS_PASSCODE?.trim();
  if (requiredPasscode && params.passcode?.trim() !== requiredPasscode) {
    throw new AIRateLimitError(
      'AI_PASSCODE_REQUIRED',
      '缺少或无效的 AI 调用访问口令 (X-AI-Passcode)',
      403
    );
  }

  // 2. 每分钟频次限流
  const maxPerMin = Math.max(1, Number(process.env.AI_RATE_LIMIT_PER_MIN || 10));
  const now = Date.now();
  const windowStart = now - 60_000;
  const key = params.organizationId || 'global';
  const timestamps = (minuteBuckets.get(key) || []).filter((ts) => ts > windowStart);

  if (timestamps.length >= maxPerMin) {
    throw new AIRateLimitError(
      'RATE_LIMITED',
      `请求过于频繁：每分钟最多允许 ${maxPerMin} 次真实模型调用，请稍后再试。`
    );
  }
  timestamps.push(now);
  minuteBuckets.set(key, timestamps);

  // 3. 每日调用次数与 Token 费用熔断（基于 model_runs 持久化统计）
  const maxDailyRuns = Math.max(1, Number(process.env.AI_DAILY_MAX_RUNS || 200));
  const maxDailyTokens = Math.max(1000, Number(process.env.AI_DAILY_MAX_TOKENS || 300000));

  const db = getDb();
  const stats = db
    .prepare(
      `SELECT COUNT(*) as run_count, COALESCE(SUM(total_tokens), 0) as tokens_used
       FROM model_runs
       WHERE status = 'success' AND date(created_at) = date('now')`
    )
    .get() as { run_count: number; tokens_used: number };

  if (stats.run_count >= maxDailyRuns) {
    throw new AIRateLimitError(
      'BUDGET_LIMIT_EXCEEDED',
      `已达每日真实模型调用次数上限 (${stats.run_count}/${maxDailyRuns})，费用熔断已生效。`
    );
  }

  if (stats.tokens_used >= maxDailyTokens) {
    throw new AIRateLimitError(
      'BUDGET_LIMIT_EXCEEDED',
      `已达每日 Token 费用上限 (${stats.tokens_used}/${maxDailyTokens})，费用熔断已生效。`
    );
  }
}

export function resetRateLimitsForTests() {
  minuteBuckets.clear();
}

export function getDailyUsageSummary() {
  const db = getDb();
  const stats = db
    .prepare(
      `SELECT COUNT(*) as run_count, COALESCE(SUM(total_tokens), 0) as tokens_used
       FROM model_runs
       WHERE status = 'success' AND date(created_at) = date('now')`
    )
    .get() as { run_count: number; tokens_used: number };
  return {
    dailyRunsUsed: stats.run_count,
    dailyRunsLimit: Number(process.env.AI_DAILY_MAX_RUNS || 200),
    dailyTokensUsed: stats.tokens_used,
    dailyTokensLimit: Number(process.env.AI_DAILY_MAX_TOKENS || 300000),
    rateLimitPerMin: Number(process.env.AI_RATE_LIMIT_PER_MIN || 10),
    maxOutputTokens: Number(process.env.AI_MAX_OUTPUT_TOKENS || 1800),
  };
}
