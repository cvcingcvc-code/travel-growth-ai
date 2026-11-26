import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { handleApiError, ok } from '@/lib/api/http';
import { requireAgentAccess } from '@/lib/api/agent-auth';
import { TenantAccessError } from '@/lib/db/tenant';
import { importAgentDraft, recordAgentRun, saveAgentAnalysis } from '@/lib/services/agent-import.service';
import { createAsset } from '@/lib/services/asset.service';
import { createKnowledgeDocument, KNOWLEDGE_CATEGORIES } from '@/lib/services/knowledge.service';
import { createContentCase, saveStrategyCard } from '@/lib/services/analysis.service';
import { ingestManualIntelligence } from '@/lib/services/intelligence.service';

const text = z.string().trim().min(1).max(8000);
const id = z.string().trim().min(1).max(100);
const optText = text.optional();
const input = z.discriminatedUnion('action', [
  z.object({ action: z.literal('import_draft'), topic: text, productId: id, strategyId: id.optional(),
    audience: text, goal: text, style: text, titles: z.array(text).length(3), selectedTitle: text,
    body: text, cover: text, pages: z.array(z.object({
      page: z.number().int().min(1).max(6), title: text, visual: text, copy: text, assetId: id,
    })).length(6), hashtags: z.array(text).min(1).max(15), cta: text,
    knowledgeIds: z.array(id).min(1).max(15), warnings: z.array(text).max(15) }),
  z.object({ action: z.literal('save_analysis'), caseId: id, titleHook: text, audience: text,
    pain: text, structure: text, emotion: text, visual: text, sellingPoints: text,
    conversion: text, reusable: text, fitScore: z.number().int().min(0).max(100),
    fitReason: text, evidence: text, credibility: z.enum(['low', 'medium', 'high']) }),
  z.object({ action: z.literal('record_run'), name: text, status: z.enum(['completed','running','failed','partial']), summary: text }),
  z.object({ action: z.literal('register_asset'), title: text,
    fileUrl: z.string().regex(/^\/demo-assets\/shanhaishiguang\/[a-z0-9-]+\.png$/),
    sourceOrigin: text }),
  z.object({ action: z.literal('save_knowledge'), category: z.enum(['D_STRATEGIES','E_EXPERIENCE']),
    title: text, content: text, sourceRef: text }),
  z.object({ action: z.literal('save_strategy'), caseAnalysisId: id.optional(), title: text, targetAudience: text,
    hookPattern: text, structureTemplate: text, conversionCta: text, applicableScenarios: text }),
  z.object({ action: z.literal('collect_case'), platform: z.enum(['xiaohongshu','public_web']), title: text,
    authorHandle: text, sourceUrl: z.string().url().refine((url) => new URL(url).protocol === 'https:'),
    sourceName: text, rawText: text, summary: text, keywords: z.array(text).min(1).max(15),
    metrics: z.record(z.union([z.number().int().nonnegative(), z.string().max(80)])),
    publishedAt: optText, collectedAt: z.string().datetime() }),
]);

export async function POST(req: NextRequest) {
  try {
    const orgId = req.headers.get('x-organization-id')?.trim() ?? '';
    const { org, actor } = requireAgentAccess(req, orgId, true);
    if (!org.is_demo) {
      throw new TenantAccessError('此导入接口仅支持授权的演示企业', 403, 'DEMO_REQUIRED');
    }
    const body = input.parse(await req.json());
    if (body.action === 'import_draft') {
      if (new Set(body.titles).size !== 3 || !body.titles.includes(body.selectedTitle) ||
        new Set(body.pages.map((page) => page.assetId)).size !== 6 ||
        !body.pages.every((page, index) => page.page === index + 1)) {
        throw new Error('需要三个不同候选标题及六个按顺序排列的不同素材');
      }
      return ok(importAgentDraft(orgId, actor, body), 201);
    }
    if (body.action === 'save_analysis') return ok(saveAgentAnalysis(orgId, actor, body), 201);
    if (body.action === 'record_run') return ok(recordAgentRun(orgId, actor, body), 201);
    if (body.action === 'register_asset') {
      if (!existsSync(resolve(process.cwd(), 'public' + body.fileUrl))) {
        throw new Error('找不到要登记的本地 PNG 文件');
      }
      return ok(createAsset({ organizationId: orgId, ...body, category: 'ai_concept', mimeType: 'image/png',
        copyrightStatus: 'ai_generated_concept', isAiGenerated: true, isDemo: true, actor }), 201);
    }
    if (body.action === 'save_knowledge') {
      const category = KNOWLEDGE_CATEGORIES.find((item) => item.code === body.category)!.code;
      return ok(createKnowledgeDocument({ organizationId: orgId, ...body, category,
        verificationStatus: 'needs_review', isDemo: true, actor }), 201);
    }
    if (body.action === 'save_strategy') {
      return ok(saveStrategyCard({ organizationId: orgId, ...body, status: 'draft', isDemo: true, actor }), 201);
    }
    const rawText = `发布时间：${body.publishedAt ?? '未知'}\n采集时间：${body.collectedAt}\n互动：${JSON.stringify(body.metrics)}\n${body.rawText}`;
    const intelligence = ingestManualIntelligence({ organizationId: orgId, title: body.title, rawContent: rawText,
      summary: body.summary, category: 'competitor', keywords: body.keywords, sourceName: body.sourceName,
      sourceUrl: body.sourceUrl, actor });
    const contentCase = createContentCase({ organizationId: orgId, platform: body.platform, title: body.title,
      authorHandle: body.authorHandle, sourceUrl: body.sourceUrl, rawText, metrics: body.metrics,
      intelligenceItemId: String(intelligence.item?.id ?? ''), collectedAt: body.collectedAt,
      isDemo: false, actor });
    return ok({ intelligence, contentCase }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
