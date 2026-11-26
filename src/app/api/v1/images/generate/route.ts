import { NextRequest } from 'next/server';
import { ensureBootstrapped, getOrgIdFromRequest, handleApiError, ok } from '@/lib/api/http';
import {
  attachImageToProjectSlide,
  generateOrRejectRealImage,
} from '@/lib/providers/image';
import { createAsset } from '@/lib/services/asset.service';

export async function POST(req: NextRequest) {
  try {
    ensureBootstrapped();
    const body = (await req.json()) as Record<string, unknown>;
    const orgId = getOrgIdFromRequest(req, body.organizationId as string | undefined);

    if (body.action === 'attach_external') {
      const imageUrl = String(body.imageUrl ?? '').trim();
      if (!imageUrl) throw new Error('请提供有效的图片 URL 或上传图片');
      const isAiGenerated = body.isAiGenerated !== false;
      const asset = createAsset({
        organizationId: orgId,
        title: String(body.title ?? '外部上传宣传图'),
        category: isAiGenerated ? 'ai_concept' : 'real_scenic',
        fileUrl: imageUrl,
        mimeType: 'image/jpeg',
        sourceOrigin: String(body.sourceOrigin ?? '外部生图上传（已登记来源）'),
        copyrightStatus: isAiGenerated ? 'ai_generated_concept' : 'owned',
        isAiGenerated,
      });
      if (body.projectId) {
        attachImageToProjectSlide(orgId, String(body.projectId), Number(body.slidePage ?? 1), imageUrl);
      }
      return ok({ asset, imageUrl }, 201);
    }

    const result = await generateOrRejectRealImage({
      organizationId: orgId,
      prompt: String(body.prompt ?? ''),
      style: body.style ? String(body.style) : undefined,
      aspectRatio: (body.aspectRatio as '3:4' | '1:1' | '16:9' | '9:16') || '3:4',
      projectId: body.projectId ? String(body.projectId) : undefined,
      slidePage: body.slidePage ? Number(body.slidePage) : 1,
      productId: body.productId ? String(body.productId) : undefined,
    });
    return ok(result, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
