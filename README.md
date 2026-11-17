# okdata GEO

单品牌 GEO 工作台。业务口径以 [docs/decisions.md](docs/decisions.md) 为准。

当前功能：引导页与 Agent 页共用一条持久化会话；聊天中的官网链接可显式交给 Pi Agent 分析；品牌设置可以抓取 okdata 官网，保存原文与正文快照，生成或手工录入事实草稿，人工审核后生效。其余业务页面仍为骨架。

## 本地启动

需要 Node.js 22.19+（建议 Node.js 24）和 npm。

```bash
npm ci
npm run db:migrate
npm run dev
```

访问 `http://localhost:3000`。已有本地数据会保留；后续迁移只新增来源、事实、版本和 Agent 动作表。D1 与 R2 本地数据都位于 `.wrangler/state/v3`，不要把这个目录提交到 Git。命令里的冒号后不要附加中文句号：运行 `npm run db:migrate`，不要运行 `npm run db:migrate。`。

## 配置事实抽取模型

将 `.env.example` 复制为 `.env.local`，填写兼容 OpenAI Chat Completions 的模型地址、模型 ID 和 API 密钥：

```env
GEO_MODEL_BASE_URL=https://api.deepseek.com/v1
GEO_MODEL_ID=deepseek-chat
GEO_MODEL_API_KEY=你的密钥
```

配置后重启 `npm run dev`，打开 `/work/system` 查看配置状态并点击「测试模型连接」。项目通过 `@earendil-works/pi-agent-core` 和 `@earendil-works/pi-ai` 接入 OpenAI Chat Completions 兼容接口；模型只在显式分析官网来源时抽取事实候选，一般聊天回复尚未接入。模型输出必须经过原文引文和数字校验，候选均为草稿，人工审核后才可能生效。模型不可用时，来源快照仍会保存，页面明确提示抽取失败，允许人工录入；不会用规则伪装模型判断。密钥只放本地环境变量，`.env.local` 已被 Git 忽略。

## 本功能验收

1. 在引导页发送含 `https://okdata.online/llms.txt` 的消息，点击「请 Agent 分析官网链接」。会话显示来源快照 ID 和处理结果；配置模型后会显示 Pi Agent 生成的待审核事实候选。刷新页面后结果仍在，重复请求不会生成第二条回复。
2. 点击「查看来源与事实」进入品牌设置，查看来源、快照 SHA-256、只读正文和草稿。也可直接在品牌设置输入官网 URL 并点击「采集并生成候选」。当前只抓取 `okdata.online` / `www.okdata.online` 的 HTTPS 文本或网页，最大 500KB。
3. 未配置模型时，复制快照中的连续原文到「原文引文」，填写一句事实、主题、适用口径和边界，保存草稿。陈述中的数字不在引文里、或引文不在快照里时会被阻止。
4. 在事实块库中打开候选，填写审核人，审核 A 级官网事实。若同主题已有生效事实，需使用「裁决为生效」；旧事实保留为冲突记录。历史版本可回退。
5. 粘贴用户材料或选择 TXT/Markdown 文件并保存，产生 B 级来源。其事实可作为内部草稿，但不能审核为对外生效。

会话发送失败会保留草稿；刷新引导或切换到 `/work/agent` 可恢复历史。聊天消息本身不会自动变成事实块，需显式点击分析链接。未配置模型时仍可测试官网采集、快照、人工录入和审核；不能验证真实模型抽取。当前无登录，适合可信本地环境；所有访问者共享 okdata 会话。远程 D1/R2 与生产部署适配尚未配置，生产运行会拒绝静默使用本地数据。可信本地环境预览可用 `GEO_LOCAL_DB=1 npm start`。

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

集成测试用临时本地 D1/R2 和本机假模型验证快照、审核、冲突、回退及 Agent 抽取；浏览器测试使用独立临时数据库与 R2，完成后关闭测试服务并删除测试数据。浏览器测试固定使用 3000 端口，运行前应确认没有已有服务占用。测试服务不会自动换端口。开发服务可用 Ctrl+C 停止。

| 路径 | 页面 |
|---|---|
| `/` | 引导对话 |
| `/work/agent` | Agent，与引导共用会话 |
| `/work/opportunities` | 机会看板（骨架） |
| `/work/diagnosis` | 诊断分析（骨架） |
| `/work/content` | 内容（骨架） |
| `/work/brand` | 来源快照与事实审核 |
| `/work/system` | 模型配置状态与连接测试；采样设置骨架 |
