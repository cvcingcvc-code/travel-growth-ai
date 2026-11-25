import { getDb } from '../db/client';
import { newId, requireOrgAccess, writeAuditLog } from '../db/tenant';

export function listAssets(organizationId: string, category?: string) {
  requireOrgAccess(organizationId);
  const db = getDb();
  if (category && category !== 'ALL') {
    return db
      .prepare('SELECT * FROM assets WHERE organization_id = ? AND category = ? ORDER BY created_at DESC')
      .all(organizationId, category);
  }
  return db
    .prepare('SELECT * FROM assets WHERE organization_id = ? ORDER BY created_at DESC')
    .all(organizationId);
}

export function createAsset(params: {
  organizationId: string;
  title: string;
  category: 'real_scenic' | 'brand_material' | 'product_photo' | 'poster' | 'document' | 'ai_concept';
  fileUrl: string;
  mimeType?: string;
  sourceOrigin: string;
  copyrightStatus: 'owned' | 'licensed' | 'pending_verification' | 'ai_generated_concept';
  isAiGenerated: boolean;
}) {
  requireOrgAccess(params.organizationId);

  // 红线校验：AI 生成的概念图绝不允许标记为真实景区实景或自有实景版权
  if (params.isAiGenerated && params.category === 'real_scenic') {
    throw new Error('合规校验失败：AI 生成的概念图不得被标记为真实景区实景照片 (real_scenic)！');
  }

  const db = getDb();
  const id = newId('ast');
  db.prepare(
    `INSERT INTO assets (id, organization_id, title, category, file_url, mime_type, source_origin, copyright_status, is_ai_generated, is_demo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
  ).run(
    id,
    params.organizationId,
    params.title.trim(),
    params.category,
    params.fileUrl.trim(),
    params.mimeType ?? 'image/jpeg',
    params.sourceOrigin.trim(),
    params.isAiGenerated ? 'ai_generated_concept' : params.copyrightStatus,
    params.isAiGenerated ? 1 : 0
  );

  writeAuditLog({
    organizationId: params.organizationId,
    action: 'asset.create',
    targetType: 'asset',
    targetId: id,
    detail: { category: params.category, isAiGenerated: params.isAiGenerated },
  });

  return db.prepare('SELECT * FROM assets WHERE id = ? AND organization_id = ?').get(id, params.organizationId);
}
