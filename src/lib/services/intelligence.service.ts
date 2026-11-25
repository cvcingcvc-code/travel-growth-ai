import { getDb } from '../db/client';
import { newId, requireOrgAccess, writeAuditLog } from '../db/tenant';
import { computeContentHash } from '../utils/text';

export function listSources(organizationId: string) {
  requireOrgAccess(organizationId);
  const db = getDb();
  return db
    .prepare('SELECT * FROM sources WHERE organization_id = ? ORDER BY created_at ASC')
    .all(organizationId);
}

export function listIntelligenceItems(organizationId: string, category?: string) {
  requireOrgAccess(organizationId);
  const db = getDb();
  if (category && category !== 'ALL') {
    return db
      .prepare(
        'SELECT * FROM intelligence_items WHERE organization_id = ? AND category = ? ORDER BY collected_at DESC'
      )
      .all(organizationId, category);
  }
  return db
    .prepare('SELECT * FROM intelligence_items WHERE organization_id = ? ORDER BY collected_at DESC')
    .all(organizationId);
}

export function ingestManualIntelligence(params: {
  organizationId: string;
  title: string;
  summary?: string;
  rawContent: string;
  category?: string;
  keywords?: string[];
  sourceName?: string;
  sourceUrl?: string;
  isDemo?: boolean;
}) {
  requireOrgAccess(params.organizationId);
  const db = getDb();
  const hash = computeContentHash(`${params.title.trim()}|${params.sourceUrl ?? ''}`);

  const dup = db
    .prepare('SELECT id FROM intelligence_items WHERE organization_id = ? AND content_hash = ?')
    .get(params.organizationId, hash) as { id: string } | undefined;

  if (dup) {
    return { duplicated: true, item: db.prepare('SELECT * FROM intelligence_items WHERE id = ?').get(dup.id) };
  }

  const id = newId('intel');
  db.prepare(
    `INSERT INTO intelligence_items (id, organization_id, title, summary, raw_content, category, keywords_json, source_name, source_url, content_hash, is_demo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    params.organizationId,
    params.title.trim(),
    params.summary?.trim() || params.rawContent.slice(0, 120),
    params.rawContent.trim(),
    params.category ?? 'trend',
    JSON.stringify(params.keywords ?? []),
    params.sourceName ?? '手动录入',
    params.sourceUrl ?? '',
    hash,
    params.isDemo ? 1 : 0
  );

  writeAuditLog({
    organizationId: params.organizationId,
    action: 'intelligence.ingest',
    targetType: 'intelligence_item',
    targetId: id,
    detail: { sourceName: params.sourceName ?? '手动录入' },
  });

  return {
    duplicated: false,
    item: db.prepare('SELECT * FROM intelligence_items WHERE id = ?').get(id),
  };
}

export function ingestCsvIntelligence(organizationId: string, csvText: string) {
  requireOrgAccess(organizationId);
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length <= 1) {
    throw new Error('CSV 内容为空或缺少数据行（格式：title,category,source_url,summary）');
  }

  let inserted = 0;
  let duplicated = 0;
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    const [title, category = 'trend', sourceUrl = '', summary = ''] = cols;
    if (!title) continue;
    const res = ingestManualIntelligence({
      organizationId,
      title,
      category,
      sourceUrl,
      summary,
      rawContent: summary || title,
      sourceName: 'CSV 批量导入',
    });
    if (res.duplicated) duplicated++;
    else inserted++;
  }
  return { inserted, duplicated };
}

export async function ingestPublicUrlOrRss(params: {
  organizationId: string;
  url: string;
  mode: 'url' | 'rss';
}) {
  requireOrgAccess(params.organizationId);
  const parsedUrl = new URL(params.url);
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('仅支持 http/https 公开链接');
  }

  const res = await fetch(parsedUrl.toString(), {
    headers: { 'User-Agent': 'TravelGrowthAI-Reader/1.0' },
  });
  if (!res.ok) {
    throw new Error(`抓取公开链接失败: HTTP ${res.status}`);
  }
  const text = await res.text();

  if (params.mode === 'rss') {
    const items = Array.from(text.matchAll(/<item>([\s\S]*?)<\/item>/gi)).slice(0, 10);
    let inserted = 0;
    let duplicated = 0;
    for (const m of items) {
      const block = m[1];
      const title = (block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1] || '').trim();
      const link = (block.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || parsedUrl.toString()).trim();
      const desc = (block.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i)?.[1] || '')
        .replace(/<[^>]+>/g, ' ')
        .trim();
      if (!title) continue;
      const r = ingestManualIntelligence({
        organizationId: params.organizationId,
        title,
        summary: desc.slice(0, 180),
        rawContent: desc || title,
        sourceName: `RSS (${parsedUrl.hostname})`,
        sourceUrl: link,
      });
      if (r.duplicated) duplicated++;
      else inserted++;
    }
    return { mode: 'rss', inserted, duplicated };
  }

  const titleMatch = text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || parsedUrl.hostname;
  const plainText = text
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 3000);

  return ingestManualIntelligence({
    organizationId: params.organizationId,
    title: titleMatch,
    summary: plainText.slice(0, 180),
    rawContent: plainText,
    sourceName: `公开网页 (${parsedUrl.hostname})`,
    sourceUrl: parsedUrl.toString(),
  });
}
