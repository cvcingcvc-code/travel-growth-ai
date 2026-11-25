# 核心业务工作流 — TravelGrowth AI

## 闭环流程
1. **企业工作空间初始化**：创建企业、配置品牌规范（`brand_profiles`）、录入产品（`products`）并导入 6 类知识文档。
2. **市场情报采集**：通过手动录入、RSS、合规公开 URL 或 CSV 导入市场动态，自动按内容指纹去重并关联来源链接与采集时间。
3. **爆款拆解与策略沉淀**：将高表现案例导入 `content_cases`，调用分析服务生成 11 维结构化 `case_analyses`，人工确认后沉淀为 `marketing_strategies`。
4. **知识检索增强创作**：在 AI 创作中心选择企业、产品、平台、客群与参考策略，系统先检索 `knowledge_chunks` 返回已核实知识引用，未核实字段提示“待核实”。
5. **人工编辑与审核**：创作者二次编辑标题、正文与多页图文方案，保存为 `content_versions` 草稿，经人工审核（`approved`）后方可记录发布（`publications`）。
6. **复盘与经验沉淀**：录入真实流量指标（`performance_metrics`），将有效经验回写至 E 类“历史内容及运营经验库”。
