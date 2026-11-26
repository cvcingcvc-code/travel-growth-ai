import { timingSafeEqual } from 'node:crypto';
import { type NextRequest } from 'next/server';
import { requireOrgAccess, TenantAccessError } from '../db/tenant';

const writeRoles = new Set(['owner', 'admin', 'editor', 'agent_editor']);

export function requireAgentAccess(req: NextRequest, organizationId: string, write = false) {
  const expected = process.env.AGENT_API_TOKEN?.trim();
  const supplied = req.headers.get('authorization')?.match(/^Bearer ([^\s]+)$/i)?.[1];
  if (!expected || !supplied ||
      Buffer.byteLength(expected) !== Buffer.byteLength(supplied) ||
      !timingSafeEqual(Buffer.from(expected), Buffer.from(supplied))) {
    throw new TenantAccessError('Agent Token 缺失或无效', 401, 'UNAUTHORIZED_AGENT');
  }

  const scopedOrg = process.env.AGENT_ORGANIZATION_ID?.trim();
  if (!scopedOrg || organizationId !== scopedOrg) {
    throw new TenantAccessError('Agent Token 未授权访问该企业', 403, 'AGENT_ORG_SCOPE_DENIED');
  }

  const actor = { actorType: 'agent', actorId: 'external-agent' } as const;
  const { org, role } = requireOrgAccess(organizationId, actor);
  if (write && !writeRoles.has(role)) {
    throw new TenantAccessError('Agent 企业角色没有写入权限', 403, 'AGENT_WRITE_DENIED');
  }
  return { org, actor };
}
