export type AICapability = 'text' | 'vision' | 'image' | 'embedding';

export type AIProviderId =
  | 'openai'
  | 'gemini'
  | 'claude'
  | 'deepseek'
  | 'ollama'
  | 'openai_compatible';

export interface ProviderConfigRecord {
  id: string;
  organization_id: string;
  capability: AICapability;
  provider: AIProviderId;
  model_name: string;
  base_url: string;
  allow_test_mode: number;
  updated_at: string;
}

export interface ProviderRuntimeStatus {
  capability: AICapability;
  provider: AIProviderId;
  modelName: string;
  baseUrl: string;
  hasValidKey: boolean;
  allowTestMode: boolean;
  status: 'connected' | 'test_mode_ready' | 'unconfigured';
  statusNote: string;
}

export interface TextGenerationRequest {
  organizationId: string;
  taskType: string;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  testModeFallback?: () => string;
}

export interface TextGenerationResult {
  content: string;
  provider: string;
  modelName: string;
  status: 'success' | 'test_mode';
  dataOrigin: 'real' | 'test_mode';
  durationMs: number;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export class ProviderUnconfiguredError extends Error {
  code = 'PROVIDER_UNCONFIGURED';
  statusCode = 422;
  guidance: string;

  constructor(message: string, guidance: string) {
    super(message);
    this.name = 'ProviderUnconfiguredError';
    this.guidance = guidance;
  }
}
