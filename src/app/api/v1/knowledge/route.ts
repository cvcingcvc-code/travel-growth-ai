import { NextRequest } from 'next/server';
import { ensureBootstrapped, getOrgIdFromRequest, handleApiError, ok } from '@/lib/api/http';
import {
  createKnowledgeDocument,
  deleteKnowledgeDocument,
  listKnowledgeDocuments,
  searchKnowledge,
  updateKnowledgeDocument,
  type KnowledgeCategory,
} from '@/lib/services/knowledge.service';

export async function GET(req: NextRequest) {
  try {
    ensureBootstrapped();
    const orgId = getOrgIdFromRequest(req);
    const q = req.nextUrl.searchParams.get('q');
    const category = req.nextUrl.searchParams.get('category') ?? undefined;
    if (q !== null && q.trim() !== '') {
      return ok({
        mode: 'search',
        query: q,
        hits: searchKnowledge(orgId, q, { category }),
      });
    }
    return ok({
      mode: 'list',
      documents: listKnowledgeDocuments(orgId, category),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    ensureBootstrapped();
    const body = (await req.json()) as Record<string, unknown>;
    const orgId = getOrgIdFromRequest(req, body.organizationId as string | undefined);
    const doc = createKnowledgeDocument({
      organizationId: orgId,
      category: String(body.category ?? 'A_FACTS') as KnowledgeCategory,
      title: String(body.title ?? ''),
      content: String(body.content ?? ''),
      sourceType: (body.sourceType as 'manual' | 'markdown' | 'txt' | 'csv') ?? 'manual',
      sourceRef: body.sourceRef ? String(body.sourceRef) : '工作台录入',
      verificationStatus:
        body.verificationStatus === 'verified' ? 'verified' : 'unverified',
      isDemo: Boolean(body.isDemo),
    });
    return ok(doc, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    ensureBootstrapped();
    const body = (await req.json()) as Record<string, unknown>;
    const orgId = getOrgIdFromRequest(req, body.organizationId as string | undefined);
    const updated = updateKnowledgeDocument({
      organizationId: orgId,
      documentId: String(body.documentId ?? ''),
      title: body.title ? String(body.title) : undefined,
      content: body.content ? String(body.content) : undefined,
      verificationStatus: body.verificationStatus as 'verified' | 'unverified' | 'needs_review' | undefined,
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
    return ok(deleteKnowledgeDocument(orgId, id));
  } catch (err) {
    return handleApiError(err);
  }
}
