import { getDb } from '../db/client';
import { writeAuditLog } from '../db/tenant';
import { createOrganization, createProduct } from './organization.service';
import { createKnowledgeDocument } from './knowledge.service';
import { createAsset } from './asset.service';
import { ensureOrganizationAgent } from './agent-orchestrator.service';

export interface OnboardingPayload {
  // 第一步：企业基础信息
  companyName: string;
  industryType: string;
  location: string;
  description: string;
  website?: string;
  mainBusiness?: string;
  contactInfo?: string;
  isDemo?: boolean;
  // 第二步：导入资料（文本/Markdown/CSV）
  importedMaterials?: Array<{ title: string; content: string; sourceType: 'manual' | 'markdown' | 'txt' | 'csv' }>;
  // 第三步：品牌定位与禁区
  brandPositioning?: string;
  brandStyle?: string;
  targetAudiences?: string[];
  companyAdvantages?: string;
  forbiddenClaims?: string[];
  // 第五步：初始产品档案
  product?: {
    name: string;
    category?: string;
    summary?: string;
    priceInfo?: string;
    address?: string;
    openingHours?: string;
    marketingGoal?: string;
    verificationStatus?: 'verified' | 'unverified';
    imageUrl?: string;
  };
  // 第六步：确认的营销方向
  confirmedMarketingDirection?: string;
}

export function completeEnterpriseOnboarding(payload: OnboardingPayload) {
  if (!payload.companyName?.trim()) {
    throw new Error('企业名称不能为空');
  }

  // 1. 创建企业工作空间
  const created = createOrganization({
    name: payload.companyName.trim(),
    industryType: payload.industryType || 'scenic_spot',
    location: payload.location || '',
    description: payload.description || '',
    isDemo: Boolean(payload.isDemo),
  });
  const orgId = (created.organization as { id: string }).id;
  const db = getDb();

  // 2. 更新品牌档案
  db.prepare(
    `UPDATE brand_profiles
     SET positioning = ?, target_audiences_json = ?, tone_keywords_json = ?, visual_guidelines = ?, forbidden_claims_json = ?, updated_at = datetime('now')
     WHERE organization_id = ?`
  ).run(
    payload.brandPositioning || payload.description || '待补充品牌定位',
    JSON.stringify(payload.targetAudiences?.length ? payload.targetAudiences : ['周末短途客群', '高意向本地客群']),
    JSON.stringify(payload.brandStyle ? payload.brandStyle.split(/[,，、\s]+/).filter(Boolean) : ['真实可信', '克制专业']),
    payload.brandStyle || '简洁自然，真实实景优先',
    JSON.stringify(payload.forbiddenClaims?.length ? payload.forbiddenClaims : ['虚构价格', '绝对化用语']),
    orgId
  );

  // 3. 自动建立结构化企业知识库（A_FACTS / C_BRAND + 导入资料）
  const factsLines = [
    `企业名称：${payload.companyName}`,
    `所属行业：${payload.industryType}`,
    `所在地：${payload.location || '[待补充]'}`,
    `官方网站：${payload.website || '[待补充]'}`,
    `主营业务：${payload.mainBusiness || payload.description || '[待补充]'}`,
    `联系方式：${payload.contactInfo || '[待补充]'}`,
    `企业核心优势：${payload.companyAdvantages || '[待补充]'}`,
  ].join('\n');

  createKnowledgeDocument({
    organizationId: orgId,
    category: 'A_FACTS',
    title: `${payload.companyName}｜企业基本事实档案`,
    content: factsLines,
    sourceType: 'manual',
    sourceRef: '企业入驻向导第一步',
    verificationStatus: payload.location && payload.mainBusiness ? 'verified' : 'needs_review',
    isDemo: Boolean(payload.isDemo),
  });

  createKnowledgeDocument({
    organizationId: orgId,
    category: 'C_BRAND',
    title: `${payload.companyName}｜品牌定位、风格与宣传禁区`,
    content: `品牌定位：${payload.brandPositioning || '[待补充]'}\n品牌风格：${payload.brandStyle || '[待补充]'}\n目标客户：${(payload.targetAudiences || []).join('、') || '[待补充]'}\n宣传禁区：${(payload.forbiddenClaims || []).join('、') || '严禁编造未核实价格与政策'}\n确认营销方向：${payload.confirmedMarketingDirection || '围绕核心产品建立收藏/咨询转化闭环'}`,
    sourceType: 'manual',
    sourceRef: '企业入驻向导第三步',
    verificationStatus: 'verified',
    isDemo: Boolean(payload.isDemo),
  });

  for (const mat of payload.importedMaterials || []) {
    if (!mat.title?.trim() || !mat.content?.trim()) continue;
    createKnowledgeDocument({
      organizationId: orgId,
      category: 'B_PRODUCTS',
      title: mat.title.trim(),
      content: mat.content.trim(),
      sourceType: mat.sourceType || 'manual',
      sourceRef: '企业入驻资料导入',
      verificationStatus: 'needs_review',
      isDemo: Boolean(payload.isDemo),
    });
  }

  // 4. 建立初始产品档案与关联素材
  let productRecord = null;
  if (payload.product?.name?.trim()) {
    productRecord = createProduct({
      organizationId: orgId,
      name: payload.product.name.trim(),
      category: payload.product.category || 'core_product',
      summary: payload.product.summary || '',
      priceInfo: payload.product.priceInfo || '待补充',
      address: payload.product.address || payload.location || '待补充',
      openingHours: payload.product.openingHours || '待补充',
      verificationStatus: payload.product.verificationStatus || 'unverified',
      isDemo: Boolean(payload.isDemo),
    });

    if (payload.product.imageUrl?.trim()) {
      createAsset({
        organizationId: orgId,
        title: `${payload.product.name} · 产品配图`,
        category: 'product_photo',
        fileUrl: payload.product.imageUrl.trim(),
        sourceOrigin: '企业入驻上传/填写',
        copyrightStatus: 'owned',
        isAiGenerated: false,
      });
    }
  }

  // 5. 自动生成持久化企业专属 Agent
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
    detail: { companyName: payload.companyName, hasProduct: Boolean(productRecord) },
  });

  return {
    organizationId: orgId,
    organization: created.organization,
    product: productRecord,
    agent,
  };
}
