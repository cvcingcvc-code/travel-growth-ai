# 独立知识库服务设计 (Independent Knowledge Service)

## 设计原则
- **模型无关性**：知识文档存储、切片、检索与版本管理不绑定任何单一厂商模型。
- **事实保护**：`src/lib/contracts/knowledge.contract.ts` 规定外部 Agent 或 Worker 导入的资料默认处于 `unverified`，严禁直接覆盖已人工核实 (`verified`) 的价格、地址、营业时间等核心事实。
- **可独立演进**：后续可将 `knowledge_chunks` 的向量检索平滑迁移至独立 Worker 或 pgvector，而不改动前端与业务接口。
