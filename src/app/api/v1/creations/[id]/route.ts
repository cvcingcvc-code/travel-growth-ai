import { NextRequest } from 'next/server';
import { ensureBootstrapped, getOrgIdFromRequest, handleApiError, ok } from '@/lib/api/http';
import { recordHumanPublication, saveDraftVersion } from '@/lib/services/creation.service';

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    ensureBootstrapped();
    const { id } = await context.params;
    const body = (await req.json()) as Record<string, unknown>;
    const orgId = getOrgIdFromRequest(req, body.organizationId as string | undefined);

    if (body.action === 'record_publication') {
      const pub = recordHumanPublication({
        organizationId: orgId,
        projectId: id,
        versionId: String(body.versionId ?? ''),
        platform: String(body.platform ?? 'xiaohongshu'),
        publishedUrl: body.publishedUrl ? String(body.publishedUrl) : '',
        humanConfirmed: Boolean(body.humanConfirmed),
      });
      return ok(pub, 201);
    }

    const updated = saveDraftVersion({
      organizationId: orgId,
      projectId: id,
      selectedTitle: String(body.selectedTitle ?? ''),
      bodyCopy: String(body.bodyCopy ?? ''),
      coverDesignNote: body.coverDesignNote ? String(body.coverDesignNote) : undefined,
      carouselPlan: Array.isArray(body.carouselPlan) ? body.carouselPlan : undefined,
      conversionCta: body.conversionCta ? String(body.conversionCta) : undefined,
      reviewStatus: body.reviewStatus as
        | 'draft'
        | 'pending_review'
        | 'approved'
        | 'rejected'
        | undefined,
    });
    return ok(updated);
  } catch (err) {
    return handleApiError(err);
  }
}
