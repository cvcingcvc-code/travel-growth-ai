import { getDb } from '../db/client';
import { newId, requireOrgAccess, writeAuditLog } from '../db/tenant';

export interface CreateOrganizationInput {
  name: string;
  industryType?: string;
  location?: string;
  description?: string;
  isDemo?: boolean;
}

export function listOrganizations() {
  const db = getDb();
  return db
    .prepare('SELECT id, name, slug, industry_type, location, description, is_demo, created_at FROM organizations ORDER BY created_at ASC')
    .all();
}

export function createOrganization(input: CreateOrganizationInput) {
  const db = getDb();
  const id = newId('org');
  const slugBase = input.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'org';
  const slug = `${slugBase}-${id.slice(-5)}`;

  db.prepare(
    `INSERT INTO organizations (id, name, slug, industry_type, location, description, is_demo)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.name.trim(),
    slug,
    input.industryType ?? 'homestay',
    input.location ?? '',
    input.description ?? '',
    input.isDemo ? 1 : 0
  );

  db.prepare(
    `INSERT INTO memberships (id, organization_id, user_id, display_name, role)
     VALUES (?, ?, 'local-admin', '企业管理员', 'owner')`
  ).run(newId('mem'), id);

  db.prepare(
    `INSERT INTO brand_profiles (id, organization_id, positioning, target_audiences_json, tone_keywords_json, visual_guidelines, forbidden_claims_json, verified_facts_note)
     VALUES (?, ?, '', '[]', '[]', '', '[]', '请核实价格、地址、营业时间与优惠政策后再发布')`
  ).run(newId('brand'), id);

  // 初始化默认模型路由偏好（密钥仍从环境变量读取）
  for (const [cap, model] of [
    ['text', process.env.AI_DEFAULT_TEXT_MODEL || 'gpt-4o-mini'],
    ['vision', 'gpt-4o-mini'],
    ['image', 'dall-e-3'],
    ['embedding', 'text-embedding-3-small'],
  ] as const) {
    db.prepare(
      `INSERT INTO provider_configs (id, organization_id, capability, provider, model_name, base_url, allow_test_mode)
       VALUES (?, ?, ?, 'openai', ?, '', 1)`
    ).run(newId('pc'), id, cap, model);
  }

  // 初始化预留平台适配器状态
  for (const [name, type, status, note] of [
    ['人工录入台', 'manual', 'connected', '已就绪'],
    ['小红书开放平台适配器', 'xiaohongshu_adapter', 'not_connected', '未接通：需企业自有合规授权'],
    ['抖音生活服务适配器', 'douyin_adapter', 'not_connected', '未接通：需企业自有合规授权'],
    ['微信公众号适配器', 'wechat_adapter', 'not_connected', '未接通：支持手动 URL/正文导入'],
  ] as const) {
    db.prepare(
      `INSERT INTO sources (id, organization_id, name, source_type, url, keywords_json, connection_status, status_note)
       VALUES (?, ?, ?, ?, '', '[]', ?, ?)`
    ).run(newId('src'), id, name, type, status, note);
  }

  writeAuditLog({
    organizationId: id,
    action: 'organization.create',
    targetType: 'organization',
    targetId: id,
    detail: { name: input.name },
  });

  return getCompanyProfile(id);
}

export function getCompanyProfile(organizationId: string) {
  const { org } = requireOrgAccess(organizationId);
  const db = getDb();
  const brand = db
    .prepare('SELECT * FROM brand_profiles WHERE organization_id = ?')
    .get(org.id) as Record<string, unknown> | undefined;
  const products = db
    .prepare('SELECT * FROM products WHERE organization_id = ? ORDER BY created_at DESC')
    .all(org.id);

  return {
    organization: org,
    brandProfile: brand ?? null,
    products,
  };
}

export function listProducts(organizationId: string) {
  requireOrgAccess(organizationId);
  const db = getDb();
  return db
    .prepare('SELECT * FROM products WHERE organization_id = ? ORDER BY created_at DESC')
    .all(organizationId);
}

export function createProduct(params: {
  organizationId: string;
  name: string;
  category?: string;
  summary?: string;
  priceInfo?: string;
  address?: string;
  openingHours?: string;
  highlights?: string[];
  verificationStatus?: 'verified' | 'unverified';
  isDemo?: boolean;
}) {
  requireOrgAccess(params.organizationId);
  const db = getDb();
  const id = newId('prod');
  db.prepare(
    `INSERT INTO products (id, organization_id, name, category, summary, price_info, address, opening_hours, highlights_json, verification_status, is_demo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    params.organizationId,
    params.name.trim(),
    params.category ?? 'scenic_product',
    params.summary ?? '',
    params.priceInfo ?? '待核实',
    params.address ?? '待核实',
    params.openingHours ?? '待核实',
    JSON.stringify(params.highlights ?? []),
    params.verificationStatus ?? 'unverified',
    params.isDemo ? 1 : 0
  );

  writeAuditLog({
    organizationId: params.organizationId,
    action: 'product.create',
    targetType: 'product',
    targetId: id,
    detail: { name: params.name, verificationStatus: params.verificationStatus ?? 'unverified' },
  });

  return db.prepare('SELECT * FROM products WHERE id = ? AND organization_id = ?').get(id, params.organizationId);
}
