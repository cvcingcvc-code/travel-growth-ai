import { NextRequest } from 'next/server';
import { ensureBootstrapped, handleApiError, ok } from '@/lib/api/http';
import { completeEnterpriseOnboarding, type OnboardingPayload } from '@/lib/services/onboarding.service';

export async function POST(req: NextRequest) {
  try {
    ensureBootstrapped();
    const body = (await req.json()) as OnboardingPayload;
    const result = completeEnterpriseOnboarding(body);
    return ok(result, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
