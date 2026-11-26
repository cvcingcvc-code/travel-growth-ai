import { getDb } from '../db/client';
import { newId, requireOrgAccess, writeAuditLog, type ActorContext } from '../db/tenant';
import {
  computeDeterministicEmbedding,
  cosineSimilarity,
  tokenizeForSearch,
} from '../utils/text';

export const KNOWLEDGE_CATEGORIES = [
  { code: 'A_FACTS', label: 'A. 企业基本事实库' },
  { code: 'B_PRODUCTS', label: 'B. 产品与服务知识库' },
  { code: 'C_BRAND', label: 'C. 品牌及目标客群知识库' },
  { code: 'D_STRATEGIES', label: 'D. 市场案例与营销策略库' },
  { code: 'E_EXPERIENCE', label: 'E. 历史内容及运营经验库' },
  { code: 'F_SYSTEM_AGENT', label: 'F. 系统使用说明与 Agent 操作知识库' },
] as const;

export type KnowledgeCategory = (typeof KNOWLEDGE_CATEGORIES)[number]['code'];

function splitIntoChunks(text: string, maxLen = 400): string[] {
  const paragraphs = text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let buf = '';
  for (const p of paragraphs) {
    if ((buf + '\n' + p).length > maxLen && buf) {
      chunks.push(buf.trim());
      buf = p;
    } else {
      buf = buf ? `${buf}\n${p}` : p;
    }
  }
  if (buf.trim()) chunks.push(buf.trim());
  return chunks.length > 0 ? chunks : [text.trim()];
}

function indexDocumentChunks(organizationId: string, documentId: string, title: string, content: string) {
  const db = getDb();
  db.prepare('DELETE FROM knowledge_chunks WHERE document_id = ? AND organization_id = ?').run(
    documentId,
    organizationId
  );

  const pieces = splitIntoChunks(`${title}\n${content}`);
  const insert = db.prepare(
    `INSERT INTO knowledge_chunks (id, organization_id, document_id, chunk_index, content, tokens_json, embedding_json)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  pieces.forEach((piece, idx) => {
    const tokens = tokenizeForSearch(piece);
    const embedding = computeDeterministicEmbedding(piece);
    insert.run(
      newId('chk'),
      organizationId,
      documentId,
      idx,
      piece,
      JSON.stringify(tokens),
      JSON.stringify(embedding)
    );
  });
}

export function listKnowledgeDocuments(organizationId: string, category?: string) {
  requireOrgAccess(organizationId);
  const db = getDb();
  if (category && category !== 'ALL') {
    return db
      .prepare(
        'SELECT * FROM knowledge_documents WHERE organization_id = ? AND category = ? ORDER BY updated_at DESC'
      )
      .all(organizationId, category);
  }
  return db
    .prepare('SELECT * FROM knowledge_documents WHERE organization_id = ? ORDER BY updated_at DESC')
    .all(organizationId);
}

export function createKnowledgeDocument(params: {
  organizationId: string;
  category: KnowledgeCategory;
  title: string;
  content: string;
  sourceType?: 'manual' | 'markdown' | 'txt' | 'csv' | 'pdf_reserved' | 'docx_reserved';
  sourceRef?: string;
  verificationStatus?: 'verified' | 'unverified' | 'needs_review';
  isDemo?: boolean;
  actor?: ActorContext;
}) {
  requireOrgAccess(params.organizationId);
  if (params.sourceType === 'pdf_reserved' || params.sourceType === 'docx_reserved') {
    throw new Error('PDF / DOCX 解析接口已在第一阶段预留，请先转换为 Markdown、TXT 或 CSV 导入。');
  }

  const db = getDb();
  const id = newId('kdoc');
  db.prepare(
    `INSERT INTO knowledge_documents (id, organization_id, category, title, content, source_type, source_ref, verification_status, version, is_demo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`
  ).run(
    id,
    params.organizationId,
    params.category,
    params.title.trim(),
    params.content.trim(),
    params.sourceType ?? 'manual',
    params.sourceRef ?? '人工录入',
    params.verificationStatus ?? 'unverified',
    params.isDemo ? 1 : 0
  );

  indexDocumentChunks(params.organizationId, id, params.title.trim(), params.content.trim());

  writeAuditLog({
    organizationId: params.organizationId,
    ...params.actor,
    action: 'knowledge.create',
    targetType: 'knowledge_document',
    targetId: id,
    detail: { category: params.category, title: params.title },
  });

  return db
    .prepare('SELECT * FROM knowledge_documents WHERE id = ? AND organization_id = ?')
    .get(id, params.organizationId);
}

export function updateKnowledgeDocument(params: {
  organizationId: string;
  documentId: string;
  title?: string;
  content?: string;
  verificationStatus?: 'verified' | 'unverified' | 'needs_review';
}) {
  requireOrgAccess(params.organizationId);
  const db = getDb();
  const existing = db
    .prepare('SELECT * FROM knowledge_documents WHERE id = ? AND organization_id = ?')
    .get(params.documentId, params.organizationId) as
    | { id: string; title: string; content: string; verification_status: string; version: number }
    | undefined;

  if (!existing) {
    throw new Error('知识文档不存在或无权访问');
  }

  const nextTitle = params.title?.trim() ?? existing.title;
  const nextContent = params.content?.trim() ?? existing.content;
  const nextStatus = params.verificationStatus ?? existing.verification_status;
  const nextVersion = existing.version + 1;

  db.prepare(
    `UPDATE knowledge_documents
     SET title = ?, content = ?, verification_status = ?, version = ?, updated_at = datetime('now')
     WHERE id = ? AND organization_id = ?`
  ).run(nextTitle, nextContent, nextStatus, nextVersion, params.documentId, params.organizationId);

  indexDocumentChunks(params.organizationId, params.documentId, nextTitle, nextContent);

  writeAuditLog({
    organizationId: params.organizationId,
    action: 'knowledge.update',
    targetType: 'knowledge_document',
    targetId: params.documentId,
    detail: { version: nextVersion, verificationStatus: nextStatus },
  });

  return db
    .prepare('SELECT * FROM knowledge_documents WHERE id = ? AND organization_id = ?')
    .get(params.documentId, params.organizationId);
}

export function deleteKnowledgeDocument(organizationId: string, documentId: string) {
  requireOrgAccess(organizationId);
  const db = getDb();
  const res = db
    .prepare('DELETE FROM knowledge_documents WHERE id = ? AND organization_id = ?')
    .run(documentId, organizationId);
  if (res.changes === 0) {
    throw new Error('知识文档不存在或无权删除');
  }
  writeAuditLog({
    organizationId,
    action: 'knowledge.delete',
    targetType: 'knowledge_document',
    targetId: documentId,
  });
  return { deleted: true, id: documentId };
}

export interface KnowledgeSearchHit {
  documentId: string;
  chunkId: string;
  title: string;
  category: string;
  verificationStatus: string;
  sourceRef: string;
  isDemo: number;
  snippet: string;
  score: number;
}

export function searchKnowledge(
  organizationId: string,
  query: string,
  options?: { category?: string; limit?: number; onlyVerified?: boolean }
): KnowledgeSearchHit[] {
  requireOrgAccess(organizationId);
  const db = getDb();
  const limit = options?.limit ?? 6;
  const qTokens = tokenizeForSearch(query);
  const qVec = computeDeterministicEmbedding(query);

  let sql = `
    SELECT c.id as chunk_id, c.document_id, c.content as chunk_content, c.tokens_json, c.embedding_json,
           d.title, d.category, d.verification_status, d.source_ref, d.is_demo
    FROM knowledge_chunks c
    JOIN knowledge_documents d ON d.id = c.document_id AND d.organization_id = c.organization_id
    WHERE c.organization_id = ?
  `;
  const args: (string | number)[] = [organizationId];

  if (options?.category && options.category !== 'ALL') {
    sql += ' AND d.category = ?';
    args.push(options.category);
  }
  if (options?.onlyVerified) {
    sql += " AND d.verification_status = 'verified'";
  }

  const rows = db.prepare(sql).all(...args) as Array<{
    chunk_id: string;
    document_id: string;
    chunk_content: string;
    tokens_json: string;
    embedding_json: string;
    title: string;
    category: string;
    verification_status: string;
    source_ref: string;
    is_demo: number;
  }>;

  const scored = rows.map((r) => {
    const chunkTokens = new Set<string>(JSON.parse(r.tokens_json || '[]') as string[]);
    const chunkVec = JSON.parse(r.embedding_json || '[]') as number[];
    let keywordHits = 0;
    for (const qt of qTokens) {
      if (chunkTokens.has(qt)) keywordHits += qt.length > 1 ? 2 : 0.5;
    }
    const keywordScore = qTokens.length > 0 ? Math.min(1, keywordHits / (qTokens.length * 1.2)) : 0;
    const vectorScore = Math.max(0, cosineSimilarity(qVec, chunkVec));
    const hasMatch = keywordHits > 0 || vectorScore > 0.45;
    const verifiedBoost = hasMatch && r.verification_status === 'verified' ? 0.12 : 0;
    const totalScore = hasMatch
      ? Number((keywordScore * 0.6 + vectorScore * 0.4 + verifiedBoost).toFixed(4))
      : 0;

    return {
      documentId: r.document_id,
      chunkId: r.chunk_id,
      title: r.title,
      category: r.category,
      verificationStatus: r.verification_status,
      sourceRef: r.source_ref,
      isDemo: r.is_demo,
      snippet: r.chunk_content.slice(0, 260),
      score: totalScore,
    };
  });

  return scored
    .filter((s) => (query.trim() ? s.score > 0.05 : true))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
