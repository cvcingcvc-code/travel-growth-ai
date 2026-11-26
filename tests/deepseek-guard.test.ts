import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resetDbForTests } from '@/lib/db/client';
import { seedDatabaseIfEmpty } from '@/lib/db/seed';
import { getProviderStatuses, recordModelRun } from '@/lib/providers/registry';
import { AIRateLimitError, enforceAIGuards, resetRateLimitsForTests } from '@/lib/providers/guard';

describe('DeepSeek 适配、自动路由、限流与费用熔断保护', () => {
  const savedEnv = { ...process.env };

  beforeEach(() => {
    resetRateLimitsForTests();
    resetDbForTests(':memory:');
    seedDatabaseIfEmpty(true);
    delete process.env.OPENAI_API_KEY;
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.AI_DEFAULT_TEXT_PROVIDER;
    delete process.env.AI_RATE_LIMIT_PER_MIN;
    delete process.env.AI_DAILY_MAX_TOKENS;
    delete process.env.AI_ACCESS_PASSCODE;
  });

  afterEach(() => {
    process.env = { ...savedEnv };
  });

  it('当仅配置 DEEPSEEK_API_KEY 时，自动将文本能力路由至 deepseek / deepseek-chat', () => {
    process.env.DEEPSEEK_API_KEY = 'sk-test-deepseek-routing-only';
    const statuses = getProviderStatuses('org_demo_spruce');
    const text = statuses.find((s) => s.capability === 'text')!;
    expect(text.provider).toBe('deepseek');
    expect(text.modelName).toBe('deepseek-chat');
    expect(text.hasValidKey).toBe(true);
    expect(text.status).toBe('connected');
  });

  it('每分钟频次限流与每日 Token 费用熔断严格生效', () => {
    process.env.AI_RATE_LIMIT_PER_MIN = '2';
    enforceAIGuards({ organizationId: 'org_demo_spruce' });
    enforceAIGuards({ organizationId: 'org_demo_spruce' });
    expect(() => enforceAIGuards({ organizationId: 'org_demo_spruce' })).toThrow(AIRateLimitError);

    resetRateLimitsForTests();
    process.env.AI_RATE_LIMIT_PER_MIN = '10';
    process.env.AI_DAILY_MAX_TOKENS = '5000';
    recordModelRun({
      organizationId: 'org_demo_spruce',
      capability: 'text',
      provider: 'deepseek',
      modelName: 'deepseek-chat',
      taskType: 'budget_test',
      status: 'success',
      durationMs: 200,
      totalTokens: 5200,
    });
    expect(() => enforceAIGuards({ organizationId: 'org_demo_spruce' })).toThrow(/费用熔断/);
  });

  it('配置 AI_ACCESS_PASSCODE 时，缺少口令拒绝消耗付费模型额度', () => {
    process.env.AI_ACCESS_PASSCODE = 'demo-secret-2026';
    expect(() => enforceAIGuards({ organizationId: 'org_demo_spruce', passcode: '' })).toThrow(/访问口令/);
    expect(() => enforceAIGuards({ organizationId: 'org_demo_spruce', passcode: 'demo-secret-2026' })).not.toThrow();
  });
});
