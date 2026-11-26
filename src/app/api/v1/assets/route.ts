import fs from 'node:fs';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { ensureBootstrapped, getOrgIdFromRequest, handleApiError, ok } from '@/lib/api/http';
import { newId } from '@/lib/db/tenant';
import {
  createAsset,
  deleteAsset,
  listAssets,
  updateAsset,
  type AssetCategory,
  type AssetCopyrightStatus,
} from '@/lib/services/asset.service';

export async function GET(req: NextRequest) {
  try {
    ensureBootstrapped();
    const orgId = getOrgIdFromRequest(req);
    const category = req.nextUrl.searchParams.get('category') ?? undefined;
    return ok(listAssets(orgId, category));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    ensureBootstrapped();
    const contentType = req.headers.get('content-type') || '';

    // 支持批量拖拽图片文件上传 (multipart/form-data)
    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      const orgId = getOrgIdFromRequest(req, String(form.get('organizationId') || ''));
      const category = (String(form.get('category') || 'reference_material') as AssetCategory);
      const sourceOrigin = String(form.get('sourceOrigin') || '企业上传素材');
      const isAiGenerated = String(form.get('isAiGenerated') || 'false') === 'true';
      const productId = String(form.get('productId') || '').trim() || null;
      const tagsRaw = String(form.get('tags') || '');
      const tags = tagsRaw.split(/[,，、\s]+/).map((t) => t.trim()).filter(Boolean);

      const files = form.getAll('files').filter((f): f is File => f instanceof File);
      if (files.length === 0) throw new Error('请选择至少一张图片文件');

      const created: unknown[] = [];
      for (const file of files) {
        const buf = Buffer.from(await file.arrayBuffer());
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
        let fileUrl = '';
        if (process.env.VERCEL !== '1') {
          const outDir = path.resolve(process.cwd(), 'public', 'demo-assets', 'uploads');
          if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
          const safeName = `${newId('up')}.${ext || 'jpg'}`;
          fs.writeFileSync(path.join(outDir, safeName), buf);
          fileUrl = `/demo-assets/uploads/${safeName}`;
        } else {
          const mime = file.type || 'image/jpeg';
          fileUrl = `data:${mime};base64,${buf.toString('base64')}`;
        }

        const title = file.name.replace(/\.[^.]+$/, '');
        const rec = createAsset({
          organizationId: orgId,
          title,
          category: isAiGenerated ? 'ai_concept' : category,
          fileUrl,
          mimeType: file.type || 'image/jpeg',
          sourceOrigin,
          copyrightStatus: isAiGenerated
            ? 'ai_generated_concept'
            : category === 'reference_material'
            ? 'reference_only'
            : 'owned',
          tags,
          productId,
          isAiGenerated,
        });
        created.push(rec);
      }
      return ok({ uploaded: created.length, items: created }, 201);
    }

    const body = (await req.json()) as Record<string, unknown>;
    const orgId = getOrgIdFromRequest(req, body.organizationId as string | undefined);
    const asset = createAsset({
      organizationId: orgId,
      title: String(body.title ?? ''),
      category: String(body.category ?? 'reference_material') as AssetCategory,
      fileUrl: String(body.fileUrl ?? ''),
      mimeType: body.mimeType ? String(body.mimeType) : 'image/jpeg',
      sourceOrigin: String(body.sourceOrigin ?? '企业上传'),
      copyrightStatus: String(body.copyrightStatus ?? 'owned') as AssetCopyrightStatus,
      tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
      productId: body.productId ? String(body.productId) : null,
      isAiGenerated: Boolean(body.isAiGenerated),
    });
    return ok(asset, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    ensureBootstrapped();
    const body = (await req.json()) as Record<string, unknown>;
    const orgId = getOrgIdFromRequest(req, body.organizationId as string | undefined);
    const updated = updateAsset({
      organizationId: orgId,
      assetId: String(body.assetId ?? ''),
      title: body.title !== undefined ? String(body.title) : undefined,
      category: body.category !== undefined ? (String(body.category) as AssetCategory) : undefined,
      tags: Array.isArray(body.tags) ? body.tags.map(String) : undefined,
      productId: body.productId !== undefined ? (body.productId ? String(body.productId) : null) : undefined,
      isFavorite: body.isFavorite !== undefined ? Boolean(body.isFavorite) : undefined,
      sourceOrigin: body.sourceOrigin !== undefined ? String(body.sourceOrigin) : undefined,
    });
    return ok(updated);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    ensureBootstrapped();
    const orgId = getOrgIdFromRequest(req);
    const id = req.nextUrl.searchParams.get('id') ?? '';
    return ok(deleteAsset(orgId, id));
  } catch (err) {
    return handleApiError(err);
  }
}
