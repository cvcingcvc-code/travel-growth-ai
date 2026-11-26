import { NextRequest } from 'next/server';
import { ensureBootstrapped, getOrgIdFromRequest, handleApiError, ok } from '@/lib/api/http';
import {
  getAgentWorkspaceState,
  runOrchestratorDiagnostic,
  updateOrganizationAgent,
} from '@/lib/services/agent-orchestrator.service';

export async function GET(req: NextRequest) {
  try {
    ensureBootstrapped();
    const orgId = getOrgIdFromRequest(req);
    return ok(getAgentWorkspaceState(orgId));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    ensureBootstrapped();
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const orgId = getOrgIdFromRequest(req, body.organizationId as string | undefined);
    const result = runOrchestratorDiagnostic(orgId, String(body.objective ?? ''));
    return ok(result, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    ensureBootstrapped();
    const body = (await req.json()) as Record<string, unknown>;
    const orgId = getOrgIdFromRequest(req, body.organizationId as string | undefined);
    const updated = updateOrganizationAgent({
      organizationId: orgId,
      agentName: body.agentName ? String(body.agentName) : undefined,
      marketingGoals: body.marketingGoals ? String(body.marketingGoals) : undefined,
      brandRules: body.brandRules ? String(body.brandRules) : undefined,
      status: body.status === 'paused' ? 'paused' : 'ready',
    });
    return ok(updated);
  } catch (err) {
    return handleApiError(err);
  }
}
