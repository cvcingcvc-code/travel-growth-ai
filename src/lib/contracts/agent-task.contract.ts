/**
 * 开放 Agent 统一任务契约
 * 所有外部 Agent 任务必须具备身份验证、企业权限控制与 audit_logs 执行记录。
 */
export type AgentTaskType =
  | 'fetch_pending_tasks'
  | 'query_knowledge'
  | 'submit_intelligence'
  | 'submit_case_analysis'
  | 'create_marketing_content'
  | 'report_task_result';

export interface AgentTaskEnvelope<T = Record<string, unknown>> {
  taskId: string;
  organizationId: string;
  agentId: string;
  taskType: AgentTaskType;
  payload: T;
  requestedAt: string;
}

export interface AgentTaskResult {
  taskId: string;
  organizationId: string;
  status: 'completed' | 'needs_human_review' | 'failed';
  dataOrigin: 'real' | 'test_mode';
  output: Record<string, unknown>;
  auditLogId?: string;
  finishedAt: string;
}
