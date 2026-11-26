import { NextRequest } from 'next/server';
import { ensureBootstrapped, getOrgIdFromRequest, handleApiError, ok } from '@/lib/api/http';
import { getDb } from '@/lib/db/client';
import { requireOrgAccess, writeAuditLog } from '@/lib/db/tenant';
import {
  generateTextWithRegistry,
  getProviderStatuses,
  updateProviderConfig,
} from '@/lib/providers/registry';
import { getDailyUsageSummary } from '@/lib/providers/guard';
import type { AICapability, AIProviderId } from '@/lib/providers/types';

export async function GET(req: NextRequest) {
  try {
    ensureBootstrapped();
    const orgId = getOrgIdFromRequest(req);
    requireOrgAccess(orgId);
    const db = getDb();
    const runs = db
      .prepare('SELECT * FROM model_runs WHERE organization_id = ? ORDER BY created_at DESC LIMIT 30')
      .all(orgId);
    return ok({
      providers: getProviderStatuses(orgId),
      runs,
      quota: getDailyUsageSummary(),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    ensureBootstrapped();
    const body = (await req.json()) as Record<string, unknown>;
    const orgId = getOrgIdFromRequest(req, body.organizationId as string | undefined);

    if (body.action === 'test_connection') {
      const res = await generateTextWithRegistry({
        organizationId: orgId,
        taskType: 'provider_connectivity_test',
        systemPrompt: '请简短回复 OK。',
        userPrompt: '连通性测试',
        testModeFallback: () => 'TEST_MODE_OK: 未配置外部模型密钥，当前以明确标记的测试模式响应。',
      });
      return ok(res);
    }

    const updated = updateProviderConfig({
      organizationId: orgId,
      capability: String(body.capability ?? 'text') as AICapability,
      provider: String(body.provider ?? 'openai') as AIProviderId,
      modelName: String(body.modelName ?? 'gpt-4o-mini'),
      baseUrl: body.baseUrl ? String(body.baseUrl) : '',
      allowTestMode: body.allowTestMode !== false,
    });

    writeAuditLog({
      organizationId: orgId,
      action: 'model_config.update',
      targetType: 'provider_config',
      targetId: String(body.capability ?? 'text'),
      detail: { provider: body.provider, modelName: body.modelName, allowTestMode: body.allowTestMode !== false },
    });

    return ok({ providers: updated });
  } catch (err) {
    return handleApiError(err);
  }
}
