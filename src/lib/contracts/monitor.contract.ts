/**
 * 独立市场信息监控服务契约
 * 网页关闭不影响未来独立 Worker/Agent 每日执行监控并写入市场情报中心。
 */
export type MonitorFrequency = 'hourly' | 'daily' | 'weekly';
export type MonitorPlatform = 'rss' | 'public_web' | 'xiaohongshu_adapter' | 'douyin_adapter' | 'wechat_adapter';

export interface MonitorJobConfig {
  id: string;
  organizationId: string;
  name: string;
  keywords: string[];
  platforms: MonitorPlatform[];
  frequency: MonitorFrequency;
  sourceUrls: string[];
  enabled: boolean;
  maxRetries: number;
}

export interface MonitorRunLog {
  runId: string;
  jobId: string;
  organizationId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'retrying';
  fetchedCount: number;
  deduplicatedCount: number;
  matchedCount: number;
  retryCount: number;
  errorMessage?: string;
  startedAt: string;
  finishedAt?: string;
}

export interface IndependentMonitorServiceContract {
  scheduleJob(config: MonitorJobConfig): Promise<void>;
  executeJob(jobId: string): Promise<MonitorRunLog>;
  deduplicateAndScoreHeat(organizationId: string, rawItems: unknown[]): Promise<{ inserted: number; duplicated: number }>;
}
