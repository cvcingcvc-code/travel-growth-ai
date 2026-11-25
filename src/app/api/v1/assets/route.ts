import { NextRequest } from 'next/server';
import { ensureBootstrapped, getOrgIdFromRequest, handleApiError, ok } from '@/lib/api/http';
import { createAsset, listAssets } from '@/lib/services/asset.service';

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
    const body = (await req.json()) as Record<string, unknown>;
    const orgId = getOrgIdFromRequest(req, body.organizationId as string | undefined);
    const asset = createAsset({
      organizationId: orgId,
      title: String(body.title ?? ''),
      category: String(body.category ?? 'real_scenic') as
        | 'real_scenic'
        | 'brand_material'
        | 'product_photo'
        | 'poster'
        | 'document'
        | 'ai_concept',
      fileUrl: String(body.fileUrl ?? '/demo-assets/bamboo-courtyard.svg'),
      mimeType: body.mimeType ? String(body.mimeType) : 'image/jpeg',
      sourceOrigin: String(body.sourceOrigin ?? '企业上传'),
      copyrightStatus: String(body.copyrightStatus ?? 'owned') as
        | 'owned'
        | 'licensed'
        | 'pending_verification'
        | 'ai_generated_concept',
      isAiGenerated: Boolean(body.isAiGenerated),
    });
    return ok(asset, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
