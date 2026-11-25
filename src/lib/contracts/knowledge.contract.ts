import type { KnowledgeCategory } from '../services/knowledge.service';

/**
 * 独立知识库服务契约（与具体大模型供应商解耦）
 * 未来可由独立 Worker 或本地模型处理切片、向量化与增量更新。
 */
export interface KnowledgeIngestionRequest {
  organizationId: string;
  category: KnowledgeCategory;
  title: string;
  content: string;
  sourceType: 'manual' | 'markdown' | 'txt' | 'csv' | 'pdf_reserved' | 'docx_reserved';
  sourceRef: string;
  actorType: 'human' | 'agent' | 'worker';
  /** 外部资料不得自动标记为已核实，必须经人工审核 */
  requestedVerificationStatus?: 'unverified' | 'needs_review';
}

export interface KnowledgeUpdateGuard {
  /** 严禁外部 Agent 或未授权导入直接覆盖 verification_status === 'verified' 的企业核心事实 */
  canOverwriteVerifiedFact(actorType: 'human' | 'agent' | 'worker'): boolean;
}

export interface IndependentKnowledgeServiceContract {
  ingestDocument(req: KnowledgeIngestionRequest): Promise<{ documentId: string; chunkCount: number }>;
  reindexEmbeddings(organizationId: string, embeddingModel: string): Promise<{ updatedChunks: number }>;
  hybridSearch(organizationId: string, query: string, options?: { category?: KnowledgeCategory; onlyVerified?: boolean; limit?: number }): Promise<unknown[]>;
  approveVerification(organizationId: string, documentId: string, reviewerId: string): Promise<void>;
}
