import { getDb } from '../db/client';
import { newId, requireOrgAccess, writeAuditLog } from '../db/tenant';

export type AssetCategory =
  | 'real_scenic'
  | 'brand_material'
  | 'product_photo'
  | 'poster'
  | 'document'
  | 'ai_concept'
  | 'reference_material';

export type AssetCopyrightStatus =
  | 'owned'
  | 'licensed'
  | 'pending_verification'
  | 'ai_generated_concept'
  | 'reference_only';

export function listAssets(organizationId: string, category?: string) {
  requireOrgAccess(organizationId);
  const db = getDb();
  if (category && category !== 'ALL') {
    if (category === 'FAVORITE') {
      return db
        .prepare('SELECT * FROM assets WHERE organization_id = ? AND is_favorite = 1 ORDER BY created_at DESC')
        .all(organizationId);
    }
    return db
      .prepare('SELECT * FROM assets WHERE organization_id = ? AND category = ? ORDER BY created_at DESC')
      .all(organizationId, category);
  }
  return db
    .prepare('SELECT * FROM assets WHERE organization_id = ? ORDER BY is_favorite DESC, created_at DESC')
    .all(organizationId);
}

export function createAsset(params: {
  organizationId: string;
  title: string;
  category: AssetCategory;
  fileUrl: string;
  mimeType?: string;
  sourceOrigin: string;
  copyrightStatus: AssetCopyrightStatus;
  tags?: string[];
  productId?: string | null;
  isFavorite?: boolean;
  isAiGenerated: boolean;
  isDemo?: boolean;
  actor?: { actorType: 'human' | 'agent' | 'system'; actorId: string };
}) {
  requireOrgAccess(params.organizationId);

  if (params.isAiGenerated && params.category === 'real_scenic') {
    throw new Error('合规校验失败：AI 生成的概念图不得被标记为真实景区实景照片 (real_scenic)！');
  }

  const db = getDb();
  const id = newId('ast');
  db.prepare(
    `INSERT INTO assets (
      id, organization_id, title, category, file_url, mime_type, source_origin,
      copyright_status, tags_json, product_id, is_favorite, is_ai_generated, is_demo
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    params.organizationId,
    params.title.trim(),
    params.category,
    params.fileUrl.trim(),
    params.mimeType ?? 'image/jpeg',
    params.sourceOrigin.trim(),
    params.isAiGenerated ? 'ai_generated_concept' : params.copyrightStatus,
    JSON.stringify(params.tags ?? []),
    params.productId ?? null,
    params.isFavorite ? 1 : 0,
    params.isAiGenerated ? 1 : 0,
    params.isDemo ? 1 : 0
  );

  writeAuditLog({
    organizationId: params.organizationId,
    actorType: params.actor?.actorType,
    actorId: params.actor?.actorId,
    action: 'asset.create',
    targetType: 'asset',
    targetId: id,
    detail: { category: params.category, isAiGenerated: params.isAiGenerated },
  });

  return db.prepare('SELECT * FROM assets WHERE id = ? AND organization_id = ?').get(id, params.organizationId);
}

export function updateAsset(params: {
  organizationId: string;
  assetId: string;
  title?: string;
  category?: AssetCategory;
  tags?: string[];
  productId?: string | null;
  isFavorite?: boolean;
  sourceOrigin?: string;
}) {
  requireOrgAccess(params.organizationId);
  const db = getDb();
  const cur = db
    .prepare('SELECT * FROM assets WHERE id = ? AND organization_id = ?')
    .get(params.assetId, params.organizationId) as Record<string, unknown> | undefined;
  if (!cur) throw new Error('素材不存在或无权访问');

  const nextCategory = params.category ?? (String(cur.category) as AssetCategory);
  if (Boolean(cur.is_ai_generated) && nextCategory === 'real_scenic') {
    throw new Error('合规校验失败：AI 概念图不得修改为真实景区实景照片');
  }

  db.prepare(
    `UPDATE assets
     SET title = ?, category = ?, tags_json = ?, product_id = ?, is_favorite = ?, source_origin = ?
     WHERE id = ? AND organization_id = ?`
  ).run(
    params.title?.trim() ?? String(cur.title),
    nextCategory,
    params.tags ? JSON.stringify(params.tags) : String(cur.tags_json ?? '[]'),
    params.productId !== undefined ? params.productId : (cur.product_id as string | null),
    params.isFavorite !== undefined ? (params.isFavorite ? 1 : 0) : Number(cur.is_favorite ?? 0),
    params.sourceOrigin?.trim() ?? String(cur.source_origin),
    params.assetId,
    params.organizationId
  );

  writeAuditLog({
    organizationId: params.organizationId,
    action: 'asset.update',
    targetType: 'asset',
    targetId: params.assetId,
  });

  return db.prepare('SELECT * FROM assets WHERE id = ? AND organization_id = ?').get(params.assetId, params.organizationId);
}

export function deleteAsset(organizationId: string, assetId: string) {
  requireOrgAccess(organizationId);
  const db = getDb();
  const res = db
    .prepare('DELETE FROM assets WHERE id = ? AND organization_id = ?')
    .run(assetId, organizationId);
  if (res.changes === 0) throw new Error('素材不存在或无权删除');

  writeAuditLog({
    organizationId,
    action: 'asset.delete',
    targetType: 'asset',
    targetId: assetId,
  });
  return { deleted: true, id: assetId };
}
