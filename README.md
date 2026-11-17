# okdata GEO

单品牌 GEO 工作台。业务口径以 [docs/decisions.md](docs/decisions.md) 为准。

当前功能：引导页与 Agent 页共用一条持久化会话；配置 DeepSeek 后，普通消息由 Pi Agent 自动回复并参考之前的对话。官网链接可显式交给 Agent 分析；品牌设置可以抓取 okdata 官网，保存原文与正文快照，生成或手工录入事实草稿，人工审核后生效。其余业务页面仍为骨架。

## 本地启动

需要 Node.js 22.19+（建议 Node.js 24）和 npm。

```bash
npm ci
npm run dev
```

`npm run dev` 会先自动应用尚未执行的本地 D1 迁移，再启动 Next。拉取新代码后如果开发服务已在运行，请停止并重新运行 `npm run dev`；缺表时也可单独运行 `npm run db:migrate`，然后重启服务。访问 `http://localhost:3000`。已有本地数据会保留；后续迁移只新增来源、事实、版本及 Agent 动作与回复表。D1 与 R2 本地数据都位于 `.wrangler/state/v3`，不要把这个目录提交到 Git。命令里的冒号后不要附加中文句号：运行 `npm run db:migrate`，不要运行 `npm run db:migrate。`。

## 配置 Pi Agent 模型

将 `.env.example` 复制为 `.env.local`，填写兼容 OpenAI Chat Completions 的模型地址、模型 ID 和 API 密钥：

```env
GEO_MODEL_BASE_URL=https://api.deepseek.com/v1
GEO_MODEL_ID=deepseek-chat
GEO_MODEL_API_KEY=你的密钥
```

配置后重启 `npm run dev`，打开 `/work/system` 查看配置状态并点击「测试模型连接」。项目通过 `@earendil-works/pi-agent-core` 和 `@earendil-works/pi-ai` 接入 DeepSeek 的 OpenAI Chat Completions 兼容接口。普通消息保存后自动生成回复；同一条会话的前文会送给模型。回复失败时消息仍在，可点击「让 Agent 回复」重试。模型还用于显式分析官网来源并抽取事实候选；候选必须经过原文引文和数字校验，人工审核后才可能生效。模型不可用时，来源快照仍会保存，允许人工录入。密钥只放本地环境变量，`.env.local` 已被 Git 忽略。

## 本功能验收

1. 配置 DeepSeek 并在 `/work/system` 测试连接。在引导页发「你好」，应自动收到 Agent 回复；再发「还记得我刚才说了什么吗」，应收到结合前文的回复。刷新后回复仍在，切换到 `/work/agent` 后可继续对话。
2. 发送含 `https://okdata.online/llms.txt` 的消息，点击「请 Agent 分析官网链接」。会话显示来源快照 ID 和处理结果；配置模型后会显示待审核事实候选。刷新后结果仍在，重复请求不会生成第二条分析回复。
3. 点击「查看来源与事实」进入品牌设置，查看来源、快照 SHA-256、只读正文和草稿。也可直接在品牌设置输入官网 URL 并点击「采集并生成候选」。当前只抓取 `okdata.online` / `www.okdata.online` 的 HTTPS 文本或网页，最大 500KB。
4. 未配置模型时，复制快照中的连续原文到「原文引文」，填写一句事实、主题、适用口径和边界，保存草稿。陈述中的数字不在引文里、或引文不在快照里时会被阻止。
5. 在事实块库中打开候选，填写审核人，审核 A 级官网事实。若同主题已有生效事实，需使用「裁决为生效」；旧事实保留为冲突记录。历史版本可回退。
6. 粘贴用户材料或选择 TXT/Markdown 文件并保存，产生 B 级来源。其事实可作为内部草稿，但不能审核为对外生效。

会话发送失败会保留草稿；刷新引导或切换到 `/work/agent` 可恢复历史。聊天消息本身不会自动变成事实块，需显式点击分析链接。未配置模型时消息仍会保存，页面会显示配置入口和回复重试按钮；仍可测试官网快照与人工事实审核。当前无登录，适合可信本地环境；所有访问者共享 okdata 会话。远程 D1/R2 与生产部署适配尚未配置，生产运行会拒绝静默使用本地数据。可信本地环境预览可用 `GEO_LOCAL_DB=1 npm start`。

引导进度读取已保存数据：提供官网链接或建立来源快照后进入「事实」；审核通过的 A 级事实达到 PRD 要求的 30 条后进入「词根」。后续阶段在相应业务对象实现前保持待开始状态。对话区隐藏原生滚动条，仍可通过鼠标、触控板和键盘滚动。

## 验证

```bash
npm run lint
npx next typegen
npx tsc --noEmit
npm test
npx playwright install chromium
npm run test:e2e
GEO_TEST_MODEL=1 npm run test:e2e -- tests/browser/chat.spec.ts
npm run build
npx astryx doctor --built .
```

集成测试用临时本地 D1/R2 和本机模拟模型验证对话、快照、审核、冲突、回退及 Agent 抽取；浏览器测试使用独立临时数据库与 R2，配置 `GEO_TEST_MODEL=1` 时再启动临时模拟模型验证两轮自动回复。测试完成后关闭服务并删除测试数据。浏览器测试固定使用 3000 端口，运行前应确认没有已有服务占用。测试服务不会自动换端口。开发服务可用 Ctrl+C 停止。

| 路径 | 页面 |
|---|---|
| `/` | 引导对话 |
| `/work/agent` | Agent，与引导共用会话 |
| `/work/opportunities` | 机会看板（骨架） |
| `/work/diagnosis` | 诊断分析（骨架） |
| `/work/content` | 内容（骨架） |
| `/work/brand` | 来源快照与事实审核 |
| `/work/system` | 模型配置状态与连接测试；采样设置骨架 |
