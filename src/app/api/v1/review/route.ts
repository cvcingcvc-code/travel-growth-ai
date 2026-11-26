import { NextRequest } from 'next/server';
import { ensureBootstrapped, getOrgIdFromRequest, handleApiError, ok } from '@/lib/api/http';
import {
  createSocialAccount,
  generateDataReviewInsight,
  getReviewOverview,
  recordPerformanceMetric,
  syncInsightToKnowledgeBase,
} from '@/lib/services/review.service';

export async function GET(req: NextRequest) {
  try {
    ensureBootstrapped();
    const orgId = getOrgIdFromRequest(req);
    return ok(getReviewOverview(orgId));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    ensureBootstrapped();
    const body = (await req.json()) as Record<string, unknown>;
    const orgId = getOrgIdFromRequest(req, body.organizationId as string | undefined);
    const action = String(body.action ?? '');

    if (action === 'create_account') {
      return ok(
        createSocialAccount({
          organizationId: orgId,
          platform: String(body.platform ?? 'xiaohongshu') as 'xiaohongshu' | 'douyin' | 'wechat_oa' | 'wechat_channels' | 'general',
          accountName: String(body.accountName ?? ''),
          accountHandle: body.accountHandle ? String(body.accountHandle) : '',
          followersCount: Number(body.followersCount ?? 0),
        }),
        201
      );
    }

    if (action === 'record_metric') {
      return ok(
        recordPerformanceMetric({
          organizationId: orgId,
          publicationId: String(body.publicationId ?? ''),
          views: Number(body.views ?? 0),
          likes: Number(body.likes ?? 0),
          collects: Number(body.collects ?? 0),
          comments: Number(body.comments ?? 0),
          inquiries: Number(body.inquiries ?? 0),
          bookings: Number(body.bookings ?? 0),
          dataSourceLabel: String(body.dataSourceLabel ?? '手动录入（标明来源）'),
          takeawayNote: body.takeawayNote ? String(body.takeawayNote) : '',
        }),
        201
      );
    }

    if (action === 'analyze') {
      return ok(generateDataReviewInsight(orgId), 201);
    }

    if (action === 'sync_to_kb') {
      return ok(syncInsightToKnowledgeBase(orgId, String(body.insightId ?? '')), 201);
    }

    throw new Error(`未知复盘操作: ${action}`);
  } catch (err) {
    return handleApiError(err);
  }
}
