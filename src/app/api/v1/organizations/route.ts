import { NextRequest } from 'next/server';
import { ensureBootstrapped, handleApiError, ok } from '@/lib/api/http';
import {
  createOrganization,
  getCompanyProfile,
  listOrganizations,
} from '@/lib/services/organization.service';

export async function GET(req: NextRequest) {
  try {
    ensureBootstrapped();
    const orgId = req.nextUrl.searchParams.get('organizationId');
    if (orgId) {
      return ok(getCompanyProfile(orgId));
    }
    return ok(listOrganizations());
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    ensureBootstrapped();
    const body = (await req.json()) as {
      name: string;
      industryType?: string;
      location?: string;
      description?: string;
      isDemo?: boolean;
    };
    if (!body?.name?.trim()) {
      throw new Error('企业名称不能为空');
    }
    const created = createOrganization(body);
    return ok(created, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
