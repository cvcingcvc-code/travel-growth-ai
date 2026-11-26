import { NextRequest, NextResponse } from 'next/server';
import { TenantAccessError } from '../db/tenant';
import { ProviderUnconfiguredError } from '../providers/types';
import { AIRateLimitError } from '../providers/guard';
import { seedDatabaseIfEmpty } from '../db/seed';

export function ensureBootstrapped() {
  seedDatabaseIfEmpty(false);
}

export function getOrgIdFromRequest(req: NextRequest, bodyOrgId?: string): string {
  const fromHeader = req.headers.get('x-organization-id');
  const fromQuery = req.nextUrl.searchParams.get('organizationId');
  return (fromHeader || bodyOrgId || fromQuery || '').trim();
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function handleApiError(err: unknown) {
  if (err instanceof TenantAccessError) {
    return NextResponse.json(
      { ok: false, error: { code: err.code, message: err.message } },
      { status: err.statusCode }
    );
  }
  if (err instanceof AIRateLimitError) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: err.code,
          message: err.message,
          guidance: err.guidance,
        },
      },
      { status: err.statusCode }
    );
  }
  if (err instanceof ProviderUnconfiguredError) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: err.code,
          message: err.message,
          guidance: err.guidance,
        },
      },
      { status: err.statusCode }
    );
  }
  const message = err instanceof Error ? err.message : '服务器内部错误';
  return NextResponse.json(
    { ok: false, error: { code: 'INTERNAL_ERROR', message } },
    { status: 400 }
  );
}
