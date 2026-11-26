import crypto from 'node:crypto';
import { getDb } from './client';

export class TenantAccessError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 403, code = 'TENANT_ACCESS_DENIED') {
    super(message);
    this.name = 'TenantAccessError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export interface ActorContext {
  actorType: 'human' | 'agent' | 'system';
  actorId: string;
}

export function requireOrgAccess(
  organizationId: string | null | undefined,
  actor: ActorContext = { actorType: 'human', actorId: 'local-admin' }
) {
  if (!organizationId || typeof organizationId !== 'string' || !organizationId.trim()) {
    throw new TenantAccessError('缺少企业工作空间标识 (organization_id)', 400, 'ORG_ID_REQUIRED');
  }

  const db = getDb();
  const org = db
    .prepare('SELECT id, name, slug, industry_type, is_demo FROM organizations WHERE id = ?')
    .get(organizationId.trim()) as
    | { id: string; name: string; slug: string; industry_type: string; is_demo: number }
    | undefined;

  if (!org) {
    throw new TenantAccessError(
      `企业工作空间不存在或无权访问: ${organizationId}`,
      404,
      'ORG_NOT_FOUND'
    );
  }

  if (actor.actorType === 'agent') {
    const member = db
      .prepare('SELECT role FROM memberships WHERE organization_id = ? AND user_id = ?')
      .get(org.id, actor.actorId) as { role: string } | undefined;
    if (!member) throw new TenantAccessError('Agent 未加入该企业工作空间', 403, 'AGENT_MEMBERSHIP_REQUIRED');
    return { org, role: member.role };
  }

  return { org, role: 'owner' };
}

export function writeAuditLog(params: {
  organizationId: string;
  actorType?: 'human' | 'agent' | 'system';
  actorId?: string;
  action: string;
  targetType: string;
  targetId?: string;
  detail?: Record<string, unknown>;
}) {
  const db = getDb();
  db.prepare(
    `INSERT INTO audit_logs (id, organization_id, actor_type, actor_id, action, target_type, target_id, detail_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    `aud_${crypto.randomUUID().slice(0, 12)}`,
    params.organizationId,
    params.actorType ?? 'human',
    params.actorId ?? 'local-admin',
    params.action,
    params.targetType,
    params.targetId ?? '',
    JSON.stringify(params.detail ?? {})
  );
}

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
}
