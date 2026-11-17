# okdata GEO

单品牌 GEO 工作台。业务口径以 [docs/decisions.md](docs/decisions.md) 为准。

已接入第一个功能：引导页与 Agent 页共用同一条持久化会话。可发送文字与链接、刷新恢复历史，发送失败保留草稿并支持重试。模型尚未接入，用户消息明确标记「待 Agent 处理」，不会自动提取事实或执行抓取。其余业务页面仍是骨架，品牌设置中的事实仍为示意数据。

## 本地启动

需要 Node.js 22.13+（建议 Node.js 24）和 npm。

```bash
npm ci
npm run db:migrate
npm run dev
```

访问 `http://localhost:3000`。进入工作台后，原会话在 `/work/agent` 可查、可继续发送。消息写入 Drizzle + 本地 D1，数据位于 `.wrangler/state/v3`；重启应用不会清空。未发送草稿保存在当前浏览器的 localStorage。数据库目录和草稿包含用户输入，请按业务数据保管。

本功能使用 Wrangler `getPlatformProxy` 连接本地 D1，无需 Cloudflare 密钥。`wrangler.jsonc` 的数据库 ID 是本地占位符。尚未配置远程 D1、R2 或部署适配器，不能直接用它部署生产环境。可信本地环境预览生产构建可用：

```bash
npm run build
GEO_LOCAL_DB=1 npm start
```

未设置 `GEO_LOCAL_DB=1` 的生产运行会明确返回存储不可用，避免误用本地数据库。仍未实现登录，所有访问者共享 okdata 引导会话，当前仅用于可信本地环境。停止开发/预览服务使用 Ctrl+C。

## 验证

```bash
npm run lint
npx next typegen
npx tsc --noEmit
npm test
npx playwright install chromium
npm run test:e2e
npm run build
npx astryx doctor --built .
```

`npm test` 使用独立临时 D1，覆盖并发初始化、重复提交、消息顺序和重启恢复。浏览器测试也使用独立临时数据库，不写入本地业务数据，完成后关闭测试服务并删除测试数据库。浏览器测试固定使用 3000 端口；运行前确认没有已有服务占用，存在占用时测试会停止，不会自动换端口。不要同时运行构建和开发服务。

手动验收：

1. 在引导页发送一段产品说明或链接，看到「已保存 · 待 Agent 处理」。
2. 刷新页面，检查消息仍在。
3. 点击「工作台」，确认原消息可见，再发送一条消息。
4. 返回引导页，确认新消息也在；停止并重启应用，检查历史恢复。
5. 在浏览器开发工具中阻断 `/api/conversation` 的 POST，发送后应显示失败并保留输入；恢复网络后重试，消息只保存一条。

| 路径 | 页面 |
|---|---|
| `/` | 引导对话 |
| `/work/agent` | Agent，与引导共用会话 |
| `/work/opportunities` | 机会看板（骨架） |
| `/work/diagnosis` | 诊断分析（骨架） |
| `/work/content` | 内容（骨架） |
| `/work/brand` | 品牌设置（示意数据） |
| `/work/system` | 系统设置（骨架） |
