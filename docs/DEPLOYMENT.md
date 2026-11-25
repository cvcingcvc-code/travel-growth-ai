# 部署指南 — TravelGrowth AI

## 1. 本地生产运行
```bash
npm install
cp .env.example .env.local
# 按需配置至少一个文本模型 API Key（如 OPENAI_API_KEY / DEEPSEEK_API_KEY / GEMINI_API_KEY）
npm run db:init
npm run build
npm run start
```

## 2. 环境变量说明
详见 `.env.example`。生产环境请务必修改 `AGENT_API_TOKEN`，并将 `DATABASE_PATH` 指向持久化存储卷。

## 3. 安全检查清单
- 确认 `.env.local` 与 `data/*.db` 未被 Git 跟踪。
- 确认生产环境已配置真实文本模型密钥，避免长期停留在测试模式。
- 建议在反向代理层（Nginx / Cloudflare）启用 HTTPS 与访问控制。
