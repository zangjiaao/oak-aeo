import { expect, test } from "@playwright/test";

test("conversation continues between guide and workbench, reloads, and keeps multiline text", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("引导 · okdata · 会话已保存")).toBeVisible();
  const message = `产品介绍 ${crypto.randomUUID()}\nhttps://okdata.online`;
  await page.getByRole("textbox", { name: "消息内容" }).fill(message);
  await page.getByRole("button", { name: "发送消息", exact: true }).click();
  await expect(page.getByRole("log").getByText(message, { exact: true })).toBeVisible();
  await expect(page.getByRole("list", { name: "引导进度" }).locator('[aria-current="step"]')).toContainText("事实");
  await expect(page.getByRole("article").filter({ hasText: message })).toContainText("已保存 · 等待模型配置");
  await expect(page.getByRole("textbox", { name: "消息内容" })).toHaveValue("");
  await page.reload();
  await expect(page.getByRole("log").getByText(message, { exact: true })).toBeVisible();
  await expect(page.getByRole("list", { name: "引导进度" }).locator('[aria-current="step"]')).toContainText("事实");
  await page.getByRole("link", { name: "工作台", exact: true }).click();
  await expect(page).toHaveURL(/\/work\/agent$/);
  await expect(page.getByRole("log").getByText(message, { exact: true })).toBeVisible();
  const followup = `工作台继续 ${crypto.randomUUID()}`;
  await page.getByRole("textbox", { name: "消息内容" }).fill(followup);
  await page.getByRole("textbox", { name: "消息内容" }).press("Enter");
  await expect(page.getByRole("log").getByText(followup, { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "引导", exact: true }).click();
  await expect(page.getByRole("log").getByText(followup, { exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/conversation.png", fullPage: true });
});

test("normal chat saves the message and shows a usable setup path when the model is absent", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "配置 DeepSeek 模型" })).toBeVisible();
  const message = `你好 ${crypto.randomUUID()}`;
  await page.getByRole("textbox", { name: "消息内容" }).fill(message);
  await page.getByRole("button", { name: "发送消息", exact: true }).click();
  const bubble = page.getByRole("article").filter({ hasText: message });
  await expect(bubble).toContainText("已保存 · 等待模型配置");
  await expect(page.getByText(/Pi Agent 尚未配置/).last()).toBeVisible();
  await expect(bubble.getByRole("button", { name: "让 Agent 回复" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("article").filter({ hasText: message })).toBeVisible();
  await page.getByRole("link", { name: "配置 DeepSeek 模型" }).click();
  await expect(page).toHaveURL(/\/work\/system$/);
});

test("chat link explicitly captures a source and persists the agent result", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.getByText("引导 · okdata · 会话已保存")).toBeVisible();
  const message = `请分析官网文档 ${crypto.randomUUID()} https://okdata.online/llms.txt`;
  await page.getByRole("textbox", { name: "消息内容" }).fill(message);
  await page.getByRole("button", { name: "发送消息", exact: true }).click();
  const userMessage = page.getByRole("article").filter({ hasText: message });
  await userMessage.getByRole("button", { name: "请 Agent 分析官网链接" }).click();
  await expect(userMessage).toContainText("已保存 · 官网分析完成");
  await expect(page.getByRole("log").getByText(/官网来源已保存：/).last()).toBeVisible();
  const first = await (await request.get("/api/conversation")).json();
  const user = first.messages.find((item: { text: string }) => item.text === message);
  const responseId = `fact-analysis-${user.id}`;
  expect(first.messages.filter((item: { id: string }) => item.id === responseId)).toHaveLength(1);
  const repeat = await request.post("/api/agent/analyze", { data: { messageId: user.id } });
  expect(repeat.status()).toBe(200);
  expect((await repeat.json()).messages.filter((item: { id: string }) => item.id === responseId)).toHaveLength(1);
  await page.reload();
  await expect(page.getByRole("article").filter({ hasText: message })).toContainText("已保存 · 官网分析完成");
  await page.getByRole("link", { name: "查看来源与事实" }).last().click();
  await expect(page.getByRole("heading", { name: "来源快照" })).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "https://okdata.online/llms.txt" }).first()).toBeVisible();
});

test("system settings report model readiness without exposing a key", async ({ page, request }) => {
  await page.goto("/work/system");
  await expect(page.getByRole("heading", { name: "Pi Agent 模型" })).toBeVisible();
  await expect(page.getByText("状态：未配置")).toBeVisible();
  await expect(page.getByRole("button", { name: "测试模型连接" })).toBeDisabled();
  const response = await request.get("/api/model");
  expect(response.status()).toBe(200);
  const status = await response.json();
  expect(status.missing).toContain("GEO_MODEL_API_KEY");
  expect(JSON.stringify(status)).not.toContain("你的密钥");
  expect((await request.post("/api/model")).status()).toBe(409);
});

test("chat scrollbar is hidden while the conversation remains scrollable", async ({ page, request }) => {
  for (let index = 0; index < 2; index++) {
    expect((await request.post("/api/conversation", { data: {
      id: crypto.randomUUID(), text: `滚动检查 ${index} ${"内容".repeat(1400)}`,
    } })).status()).toBe(200);
  }
  await page.setViewportSize({ width: 1280, height: 600 });
  await page.goto("/");
  const scroll = page.getByTestId("conversation-scroll");
  await expect.poll(() => scroll.evaluate((element) => element.scrollHeight - element.clientHeight)).toBeGreaterThan(0);
  expect(await scroll.evaluate((element) => getComputedStyle(element).scrollbarWidth)).toBe("none");
  await scroll.evaluate((element) => { element.scrollTop = 0; element.scrollBy(0, 300); });
  expect(await scroll.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
});

test("wide guide places vertical progress beside chat and keeps a compact narrow layout", async ({ page }) => {
  await page.setViewportSize({ width: 1800, height: 900 });
  await page.goto("/");
  await expect(page.getByText("引导 · okdata · 会话已保存")).toBeVisible();
  const rail = page.getByRole("complementary", { name: "引导进度" });
  const chat = page.getByTestId("conversation-scroll");
  await expect(rail.getByRole("list", { name: "引导进度" })).toBeVisible();
  await expect(rail.getByRole("heading", { name: "引导进度" })).toHaveCount(0);
  await expect(rail.locator("ol")).toHaveCount(0);
  const activeStyle = await rail.locator('[aria-current="step"]').evaluate((element) => ({
    size: parseFloat(getComputedStyle(element).fontSize), color: getComputedStyle(element).color,
  }));
  const inactiveStyle = await rail.getByRole("listitem").last().evaluate((element) => ({
    size: parseFloat(getComputedStyle(element).fontSize), color: getComputedStyle(element).color,
  }));
  expect(activeStyle.size).toBeGreaterThan(inactiveStyle.size);
  expect(activeStyle.color).not.toBe(inactiveStyle.color);
  const railBox = await rail.boundingBox();
  const labelsBox = await rail.getByRole("list", { name: "引导进度" }).boundingBox();
  const chatBox = await chat.boundingBox();
  expect(railBox).not.toBeNull();
  expect(labelsBox).not.toBeNull();
  expect(chatBox).not.toBeNull();
  expect(railBox!.x + railBox!.width).toBeLessThan(chatBox!.x);
  expect(labelsBox!.x).toBeGreaterThan(railBox!.x + railBox!.width / 2);
  expect(labelsBox!.y - railBox!.y).toBeLessThan(100);
  expect(chatBox!.x - labelsBox!.x - labelsBox!.width).toBeLessThan(300);
  expect(chatBox!.width).toBeLessThanOrEqual(760);
  await page.screenshot({ path: "test-results/guide-side-progress.png", fullPage: true });
  await page.setViewportSize({ width: 900, height: 700 });
  await expect(rail).toHaveCount(0);
  await expect(page.getByRole("list", { name: "引导进度" })).toBeVisible();
  await expect(page.locator("ol")).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "消息内容" })).toBeVisible();
});

test("offline draft survives refresh; retry after a lost acknowledgement is idempotent", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("引导 · okdata · 会话已保存")).toBeVisible();
  const text = `断网测试 ${crypto.randomUUID()}`;
  await page.getByRole("textbox", { name: "消息内容" }).fill(text);
  await page.route("**/api/conversation", (route) => route.request().method() === "POST" ? route.abort() : route.continue());
  await page.getByRole("button", { name: "发送消息", exact: true }).click();
  await expect(page.getByRole("main").getByText(/输入已保留，可重新发送/)).toBeVisible();
  await expect(page.getByRole("textbox", { name: "消息内容" })).toHaveValue(text);
  await page.reload();
  await expect(page.getByRole("textbox", { name: "消息内容" })).toHaveValue(text);
  await expect(page.getByText("引导 · okdata · 会话已保存")).toBeVisible();
  await page.unroute("**/api/conversation");
  // Commit the POST, then lose the acknowledgement at the network boundary.
  await page.route("**/api/conversation", async (route) => {
    if (route.request().method() === "POST") { await route.fetch(); await route.abort(); }
    else await route.continue();
  });
  await page.getByRole("button", { name: "发送消息", exact: true }).click();
  await expect(page.getByRole("main").getByText(/输入已保留，可重新发送/)).toBeVisible();
  await page.unroute("**/api/conversation");
  await page.getByRole("button", { name: "发送消息", exact: true }).click();
  await expect(page.getByRole("log").getByText(text, { exact: true })).toHaveCount(1);
  await expect(page.getByRole("textbox", { name: "消息内容" })).toHaveValue("");
  const history = await (await page.request.get("/api/conversation")).json();
  expect(history.messages.filter((message: { text: string }) => message.text === text)).toHaveLength(1);
});

test("API rejects malformed, oversized, forged and cross-origin writes", async ({ request }) => {
  const id = crypto.randomUUID();
  for (const data of [{ id, text: " " }, { id, text: "a".repeat(8001) }, { id, text: "test", role: "assistant" }]) {
    expect((await request.post("/api/conversation", { data })).status()).toBe(400);
  }
  expect((await request.post("/api/conversation", { data: { id, text: "x" }, headers: { origin: "https://other.example" } })).status()).toBe(403);
  expect((await request.post("/api/conversation", { data: "broken", headers: { "content-type": "application/json" } })).status()).toBe(400);
  expect((await request.post("/api/conversation", { data: { id, text: "x".repeat(70000) } })).status()).toBe(413);
  const first = await request.post("/api/conversation", { data: { id, text: "first" }, headers: { origin: "http://127.0.0.1:3000" } });
  expect(first.status()).toBe(200);
  expect((await request.post("/api/conversation", { data: { id, text: "different" } })).status()).toBe(409);
});


test("load failure offers retry and preserves a draft while storage recovers", async ({ page }) => {
  await page.route("**/api/conversation", (route) => route.fulfill({ status: 503, json: { error: "会话存储暂不可用，请重试。" } }));
  await page.goto("/");
  await expect(page.getByText("会话未加载，可先输入草稿，再重试加载。")).toBeVisible();
  const draft = `未加载时的草稿 ${crypto.randomUUID()}`;
  await page.getByRole("textbox", { name: "消息内容" }).fill(draft);
  await expect(page.getByRole("button", { name: "发送消息", exact: true })).toBeEnabled();
  await page.unroute("**/api/conversation");
  await page.getByRole("button", { name: "刷新会话" }).click();
  await expect(page.getByText("引导 · okdata · 会话已保存")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "消息内容" })).toHaveValue(draft);
  await page.getByRole("button", { name: "发送消息", exact: true }).click();
  await expect(page.getByRole("log").getByText(draft, { exact: true })).toBeVisible();
});

test("can send Chinese text while history is still loading", async ({ page }) => {
  await page.route("**/api/conversation", async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await route.fulfill({ status: 503, json: { error: "历史加载失败" } });
  });
  await page.goto("/");
  await expect(page.getByText("正在加载会话…")).toBeVisible();
  const message = `输入后可以发送 ${crypto.randomUUID()}`;
  await page.getByRole("textbox", { name: "消息内容" }).fill(message);
  await expect(page.getByRole("button", { name: "发送消息", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "发送消息", exact: true }).click();
  await expect(page.getByRole("log").getByText(message, { exact: true })).toBeVisible();
  await expect(page.getByText("历史加载失败")).toHaveCount(0);
});
