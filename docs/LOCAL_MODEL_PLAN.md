# 下一阶段本地模型接入方案 (Local Model Integration Plan)

## 1. 支持的本地与私有模型协议
通过 `src/lib/providers/registry.ts` 统一抽象层，下一阶段可直接启用以下本地/私有模型服务：
- **Ollama**：`OLLAMA_BASE_URL=http://localhost:11434`（支持文本与 Embedding）
- **LM Studio**：`LM_STUDIO_BASE_URL=http://localhost:1234/v1`（OpenAI-compatible）
- **vLLM**：`VLLM_BASE_URL=http://localhost:8000/v1`（高并发生产推理）
- **任意 OpenAI-compatible 网关**：OneAPI / LiteLLM / 私有网关

## 2. 分任务模型路由建议
- `case_analysis`（爆款拆解）：推荐使用长上下文指令微调模型（如 Qwen2.5-14B / 32B）。
- `generate_copy_and_visual`（文案与图文）：推荐使用中文表达能力强的模型或云端高精度模型。
- `embedding`（知识库向量索引）：推荐使用 BGE-M3 或 `nomic-embed-text`（与文本模型解耦）。

## 3. 安全与超时红线
1. **禁止无认证公网暴露**：`validateLocalEndpointSecurity` 强制校验非 `localhost`/`127.0.0.1` 的本地推理端点必须配置 `LOCAL_MODEL_AUTH_TOKEN`。
2. **超时控制**：统一通过 `AbortSignal.timeout(timeoutMs)` 防止本地推理卡死。
3. **运行审计**：所有本地模型调用同样写入 `model_runs` 记录耗时与状态。
