import { getDb } from '../db/client';
import { writeAuditLog } from '../db/tenant';
import { createOrganization, createProduct } from './organization.service';
import { createKnowledgeDocument } from './knowledge.service';
import { createAsset } from './asset.service';
import { ensureOrganizationAgent } from './agent-orchestrator.service';

export interface OnboardingMaterial {
  title: string;
  content: string;
  sourceType: 'manual' | 'markdown' | 'txt' | 'csv';
  contentHash?: string;
  category?: 'A_FACTS' | 'B_PRODUCTS' | 'C_BRAND' | 'D_STRATEGIES' | 'E_EXPERIENCE' | 'F_SYSTEM_AGENT';
  verificationStatus?: 'verified' | 'unverified' | 'needs_review';
}

export interface OnboardingProductInput {
  name: string;
  category?: string;
  summary?: string;
  priceInfo?: string;
  address?: string;
  openingHours?: string;
  verificationStatus?: 'verified' | 'unverified';
  imageUrl?: string;
}

export interface OnboardingPayload {
  companyName: string;
  industryType: string;
  location: string;
  description: string;
  website?: string;
  mainBusiness?: string;
  contactInfo?: string;
  isDemo?: boolean;
  importedMaterials?: OnboardingMaterial[];
  brandPositioning?: string;
  brandStyle?: string;
  targetAudiences?: string[];
  companyAdvantages?: string;
  forbiddenClaims?: string[];
  product?: OnboardingProductInput;
  products?: OnboardingProductInput[];
  confirmedMarketingDirection?: string;
}

export function completeEnterpriseOnboarding(payload: OnboardingPayload) {
  if (!payload.companyName?.trim()) {
    throw new Error('企业名称不能为空');
  }

  const isDemo = Boolean(payload.isDemo);

  // 1. 创建独立企业工作空间（严禁把演示企业默认图片/画像/方向写入真实新企业）
  const created = createOrganization({
    name: payload.companyName.trim(),
    industryType: payload.industryType || 'scenic_spot',
    location: payload.location?.trim() || '',
    description: payload.description?.trim() || '',
    isDemo,
  });
  const orgId = (created.organization as { id: string }).id;
  const db = getDb();

  const audiences = (payload.targetAudiences || []).map((s) => s.trim()).filter(Boolean);
  const forbidden = (payload.forbiddenClaims || []).map((s) => s.trim()).filter(Boolean);
  const toneKeywords = (payload.brandStyle || '')
    .split(/[,，、\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  // 2. 更新品牌档案（未填写项保持空或标注待补充，绝不注入演示默认值）
  db.prepare(
    `UPDATE brand_profiles
     SET positioning = ?, target_audiences_json = ?, tone_keywords_json = ?, visual_guidelines = ?, forbidden_claims_json = ?, updated_at = datetime('now')
     WHERE organization_id = ?`
  ).run(
    payload.brandPositioning?.trim() || '',
    JSON.stringify(audiences),
    JSON.stringify(toneKeywords),
    payload.brandStyle?.trim() || '',
    JSON.stringify(forbidden),
    orgId
  );

  // 3. 建立结构化企业基本事实与品牌文档
  const factsLines = [
    `企业名称：${payload.companyName.trim()}`,
    `所属行业：${payload.industryType || '[待补充]'}`,
    `所在地：${payload.location?.trim() || '[待补充]'}`,
    `官方网站：${payload.website?.trim() || '[待补充]'}`,
    `主营业务：${payload.mainBusiness?.trim() || payload.description?.trim() || '[待补充]'}`,
    `联系方式：${payload.contactInfo?.trim() || '[待补充]'}`,
    `企业核心优势：${payload.companyAdvantages?.trim() || '[待补充]'}`,
  ].join('\n');

  createKnowledgeDocument({
    organizationId: orgId,
    category: 'A_FACTS',
    title: `${payload.companyName.trim()}｜企业基本事实档案`,
    content: factsLines,
    sourceType: 'manual',
    sourceRef: '企业入驻向导录入',
    verificationStatus: payload.location?.trim() && payload.mainBusiness?.trim() ? 'verified' : 'needs_review',
    isDemo,
  });

  if (payload.brandPositioning?.trim() || payload.brandStyle?.trim() || audiences.length > 0 || forbidden.length > 0) {
    createKnowledgeDocument({
      organizationId: orgId,
      category: 'C_BRAND',
      title: `${payload.companyName.trim()}｜品牌定位与表达规范`,
      content: [
        `品牌定位：${payload.brandPositioning?.trim() || '[待补充]'}`,
        `品牌风格：${payload.brandStyle?.trim() || '[待补充]'}`,
        `目标客户：${audiences.join('、') || '[待补充]'}`,
        `宣传禁区：${forbidden.join('、') || '[待补充]'}`,
        `确认营销方向：${payload.confirmedMarketingDirection?.trim() || '[待补充]'}`,
      ].join('\n'),
      sourceType: 'manual',
      sourceRef: '企业入驻向导确认',
      verificationStatus: 'verified',
      isDemo,
    });
  }

  // 4. 完整无截断导入多份企业资料（自动去重）
  const seenHashes = new Set<string>();
  let importedDocsCount = 0;
  for (const mat of payload.importedMaterials || []) {
    if (!mat.title?.trim() || !mat.content?.trim()) continue;
    const key = mat.contentHash || `${mat.title.trim()}:${mat.content.length}`;
    if (seenHashes.has(key)) continue;
    seenHashes.add(key);

    createKnowledgeDocument({
      organizationId: orgId,
      category: mat.category || 'B_PRODUCTS',
      title: mat.title.trim(),
      content: mat.content.trim(), // 完整保留全文，绝不截断
      sourceType: mat.sourceType || 'manual',
      sourceRef: `资料导入 (${mat.title.trim()})`,
      verificationStatus: mat.verificationStatus || 'needs_review',
      isDemo,
    });
    importedDocsCount++;
  }

  // 5. 支持多产品建档（兼容单产品 product 字段）
  const productInputs: OnboardingProductInput[] = [
    ...(payload.products || []),
    ...(payload.product?.name?.trim() ? [payload.product] : []),
  ].filter((p) => p.name?.trim());

  const createdProducts: unknown[] = [];
  for (const p of productInputs) {
    const rec = createProduct({
      organizationId: orgId,
      name: p.name.trim(),
      category: p.category || 'core_product',
      summary: p.summary?.trim() || '',
      priceInfo: p.priceInfo?.trim() || '待补充',
      address: p.address?.trim() || payload.location?.trim() || '待补充',
      openingHours: p.openingHours?.trim() || '待补充',
      verificationStatus: p.verificationStatus || 'unverified',
      isDemo,
    });
    createdProducts.push(rec);

    if (p.imageUrl?.trim()) {
      createAsset({
        organizationId: orgId,
        title: `${p.name.trim()} · 企业实拍/配图`,
        category: 'product_photo',
        fileUrl: p.imageUrl.trim(),
        sourceOrigin: '企业入驻上传/填写',
        copyrightStatus: 'owned',
        isAiGenerated: false,
      });
    }
  }

  // 6. 自动创建持久化专属营销 Agent
  const agent = ensureOrganizationAgent(orgId);
  if (payload.confirmedMarketingDirection?.trim()) {
    db.prepare('UPDATE organization_agents SET marketing_goals = ? WHERE organization_id = ?').run(
      payload.confirmedMarketingDirection.trim(),
      orgId
    );
  }

  writeAuditLog({
    organizationId: orgId,
    action: 'onboarding.complete',
    targetType: 'organization',
    targetId: orgId,
    detail: {
      companyName: payload.companyName.trim(),
      importedDocsCount,
      productsCount: createdProducts.length,
    },
  });

  return {
    organizationId: orgId,
    organization: created.organization,
    product: createdProducts[0] ?? null,
    products: createdProducts,
    importedDocsCount,
    agent,
  };
}
