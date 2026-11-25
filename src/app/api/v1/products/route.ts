import { NextRequest } from 'next/server';
import { ensureBootstrapped, getOrgIdFromRequest, handleApiError, ok } from '@/lib/api/http';
import { createProduct, listProducts } from '@/lib/services/organization.service';

export async function GET(req: NextRequest) {
  try {
    ensureBootstrapped();
    const orgId = getOrgIdFromRequest(req);
    return ok(listProducts(orgId));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    ensureBootstrapped();
    const body = (await req.json()) as Record<string, unknown>;
    const orgId = getOrgIdFromRequest(req, body.organizationId as string | undefined);
    const product = createProduct({
      organizationId: orgId,
      name: String(body.name ?? ''),
      category: body.category ? String(body.category) : undefined,
      summary: body.summary ? String(body.summary) : undefined,
      priceInfo: body.priceInfo ? String(body.priceInfo) : undefined,
      address: body.address ? String(body.address) : undefined,
      openingHours: body.openingHours ? String(body.openingHours) : undefined,
      highlights: Array.isArray(body.highlights) ? body.highlights.map(String) : undefined,
      verificationStatus:
        body.verificationStatus === 'verified' ? 'verified' : 'unverified',
      isDemo: Boolean(body.isDemo),
    });
    return ok(product, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
