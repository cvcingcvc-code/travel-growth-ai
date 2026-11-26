import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as callAgent } from '@/app/api/v1/agent/route';
import { POST as callMcp } from '@/app/api/mcp/route';
import { getDb, resetDbForTests } from '@/lib/db/client';
import { seedDatabaseIfEmpty } from '@/lib/db/seed';

const org = 'org_demo_songjian';
const token = 'local-unit-test-token';

function request(path: string, body: object, supplied?: string, target = org) {
  const headers = new Headers({ 'content-type': 'application/json', 'x-organization-id': target });
  if (supplied) headers.set('authorization', `Bearer ${supplied}`);
  return new NextRequest(`http://localhost:3000${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

const log = { action: 'record_run', name: '授权测试', summary: '只写入内存测试数据库', status: 'completed' };

describe('Agent 权限边界', () => {
  beforeEach(() => {
    resetDbForTests(':memory:');
    seedDatabaseIfEmpty(true);
    vi.stubEnv('AGENT_API_TOKEN', token);
    vi.stubEnv('AGENT_ORGANIZATION_ID', org);
  });
  afterEach(() => vi.unstubAllEnvs());

  it('两个 Agent 入口拒绝缺失或错误的 Token', async () => {
    expect((await callMcp(request('/api/mcp', { tool: 'get_company_profile' }))).status).toBe(401);
    expect((await callAgent(request('/api/v1/agent', log))).status).toBe(401);
    expect((await callMcp(request('/api/mcp', { tool: 'get_company_profile' }, 'invalid'))).status).toBe(401);
    vi.stubEnv('AGENT_API_TOKEN', '');
    expect((await callAgent(request('/api/v1/agent', log, token))).status).toBe(401);
  });

  it('Token 只适用于指定企业，读取仍需要企业成员权限', async () => {
    expect((await callAgent(request('/api/v1/agent', log, token, 'org_demo_qingcheng'))).status).toBe(403);
    getDb().prepare('DELETE FROM memberships WHERE organization_id = ? AND user_id = ?').run(org, 'external-agent');
    expect((await callMcp(request('/api/mcp', { tool: 'get_company_profile' }, token))).status).toBe(403);
  });

  it('只读成员可读，只有编辑成员可写，审计记录包含 Agent 身份', async () => {
    expect((await callMcp(request('/api/mcp', { tool: 'get_company_profile' }, token))).status).toBe(200);
    expect((await callAgent(request('/api/v1/agent', log, token))).status).toBe(403);
    getDb().prepare('UPDATE memberships SET role = ? WHERE organization_id = ? AND user_id = ?')
      .run('agent_editor', org, 'external-agent');
    expect((await callAgent(request('/api/v1/agent', log, token))).status).toBe(201);
    expect(getDb().prepare("SELECT actor_type FROM audit_logs WHERE organization_id = ? AND action = 'workflow.record_agent'")
      .get(org)).toMatchObject({ actor_type: 'agent' });
  });
});