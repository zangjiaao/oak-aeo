import { expect, test } from "@playwright/test";

test("conversation continues between guide and workbench, reloads, and keeps multiline text", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("引导 · okdata · 会话已保存")).toBeVisible();
  const message = `产品介绍 ${crypto.randomUUID()}\nhttps://okdata.online`;
  await page.getByRole("textbox", { name: "消息内容" }).fill(message);
  await page.getByRole("button", { name: "发送消息", exact: true }).click();
  await expect(page.getByRole("log").getByText(message, { exact: true })).toBeVisible();
  await expect(page.getByRole("article").filter({ hasText: message })).toContainText("已保存 · 待 Agent 处理");
  await expect(page.getByRole("textbox", { name: "消息内容" })).toHaveValue("");
  await page.reload();
  await expect(page.getByRole("log").getByText(message, { exact: true })).toBeVisible();
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
  await page.unroute("**/api/conversation");
  await page.getByRole("button", { name: "刷新会话" }).click();
  await expect(page.getByText("引导 · okdata · 会话已保存")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "消息内容" })).toHaveValue(draft);
  await page.getByRole("button", { name: "发送消息", exact: true }).click();
  await expect(page.getByRole("log").getByText(draft, { exact: true })).toBeVisible();
});
