import { expect, test } from "@playwright/test";

test("configured Pi Agent automatically replies with context and persists both turns", async ({ page, request }) => {
  test.skip(process.env.GEO_TEST_MODEL !== "1", "Run with GEO_TEST_MODEL=1 to use the local Pi-compatible mock.");
  await page.goto("/work/system");
  await expect(page.getByText("状态：已配置")).toBeVisible();
  await page.getByRole("button", { name: "测试模型连接" }).click();
  await expect(page.getByText(/连接成功：mock-chat/)).toBeVisible();
  await page.goto("/");
  await expect(page.getByText("引导 · okdata · 会话已保存")).toBeVisible();
  const first = `第一轮：我们做数据接口产品。${crypto.randomUUID()}`;
  await page.getByRole("textbox", { name: "消息内容" }).fill(first);
  await page.getByRole("button", { name: "发送消息", exact: true }).click();
  await expect(page.getByRole("log").getByText("你好，我是 okdata 的 GEO 助手。请介绍你的产品主要服务谁？", { exact: true })).toBeVisible();
  await expect(page.getByRole("article").filter({ hasText: first })).toContainText("Agent 已回复");
  const second = `第二轮：还记得我做什么吗？${crypto.randomUUID()}`;
  await page.getByRole("textbox", { name: "消息内容" }).fill(second);
  await page.getByRole("button", { name: "发送消息", exact: true }).click();
  await expect(page.getByRole("log").getByText("记得，你在第一轮介绍了数据接口产品。", { exact: true })).toBeVisible();
  const history = await (await request.get("/api/conversation")).json();
  const user = history.messages.find((item: { text: string }) => item.text === second);
  expect(history.messages.filter((item: { id: string }) => item.id === `agent-reply-${user.id}`)).toHaveLength(1);
  const repeated = await request.post("/api/agent/respond", { data: { messageId: user.id } });
  expect(repeated.status()).toBe(200);
  expect((await repeated.json()).messages.filter((item: { id: string }) => item.id === `agent-reply-${user.id}`)).toHaveLength(1);
  await page.reload();
  await expect(page.getByRole("log").getByText("记得，你在第一轮介绍了数据接口产品。", { exact: true })).toBeVisible();
});
