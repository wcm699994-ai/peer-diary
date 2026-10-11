# 同行日记 · 网页版

纯静态网页日记本：每日写一篇正文，AI（默认 DeepSeek）自动生成情绪、能量/专注、高光/低谷/小胜利等指标并可视化呈现；按月日历/列表查日记；Markdown 导出与 JSON 备份迁移。数据经 PIN 加密后只存在浏览器 IndexedDB，服务器零存储。

## 功能

- **写日记**：只写正文，保存后自动 AI 分析（可重试/重新分析），近 7 天能量/专注趋势条
- **时间轴**：月历（有日记的日期标能量色点）+ 按月列表，点击直达当天
- **导出**：Markdown（可按日期区间）；JSON 备份导入导出用于跨设备迁移
- **安全**：PIN + PBKDF2（31 万次迭代）+ AES-GCM 逐条加密；页面隐藏自动锁定；忘记 PIN 无法恢复

## 本地开发

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # vitest 单测
npm run build    # 产物在 dist/
```

## 部署

- **Docker 平台（帽子云 Git 集成等）**：仓库根目录自带 Dockerfile，平台自动识别构建，监听端口 80。
- **纯静态托管**：构建命令 `npm ci && npm run build`，发布目录 `dist`。
- 部署在子路径时需在 vite.config.ts 加 `base: '/子路径/'` 后重新构建。

## AI 配置

设置页默认预置 DeepSeek（`https://api.deepseek.com/v1` + `deepseek-chat`），填入自己的 API Key 即可；任意 OpenAI 兼容接口均可（需允许浏览器跨域）。`scripts/mock-ai.mjs` 为联调用 mock 服务。
