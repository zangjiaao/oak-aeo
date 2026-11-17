import { expect, test } from "@playwright/test";

test("pasted source saves an R2 snapshot and produces a reviewable internal fact", async ({ page }) => {
  await page.goto("/work/brand");
  await expect(page.getByRole("heading", { name: "来源快照" })).toBeVisible();
  const title = `用户说明 ${crypto.randomUUID()}`;
  const quote = "公开接口当前为 235 个。";
  const material = `${quote}该数据仅用于当前版本的产品说明，后续版本可能变化。`;
  await page.getByRole("textbox", { name: "材料标题" }).fill(title);
  await page.getByRole("textbox", { name: "材料正文" }).fill(material);
  await page.getByRole("button", { name: "保存 B 级来源" }).click();
  await expect(page.getByText("来源已保存。未配置模型，可在品牌设置手动建立事实草稿。", { exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "快照正文（只读，可复制引文）" })).toHaveValue(material);
  await page.getByRole("textbox", { name: "主题键" }).fill(`接口数量 ${crypto.randomUUID()}`);
  await page.getByRole("textbox", { name: "一句事实陈述" }).fill(quote);
  await page.getByRole("textbox", { name: "原文引文" }).fill(quote);
  await page.getByRole("textbox", { name: "适用口径" }).fill("当前版本");
  await page.getByRole("textbox", { name: "边界" }).fill("后续版本可能变化");
  await page.getByRole("button", { name: "保存事实草稿" }).click();
  await expect(page.getByText("事实草稿已保存，尚未生效。")).toBeVisible();
  await page.getByRole("row").filter({ hasText: quote }).getByRole("button", { name: "查看与审核" }).click();
  await expect(page.getByRole("button", { name: "审核生效" })).toBeDisabled();
  await expect(page.getByText(/当前：draft · v1/)).toBeVisible();
  await page.screenshot({ path: "test-results/facts.png", fullPage: true });
});

test("fact API rejects invented numbers and non-official approval", async ({ request }) => {
  const material = await request.post("/api/sources", { data: {
    kind: "material", title: "API 校验材料", text: "接口总数为 235 个。该数字用于当前版本。",
  } });
  expect(material.status()).toBe(201);
  const { source } = await material.json();
  const base = { sourceId: source.id, topic: `接口 ${crypto.randomUUID()}`,
    statement: "接口总数为 235 个。", quote: "接口总数为 235 个。",
    scope: "当前版本", boundary: "仅限当前版本" };
  const bad = await request.post("/api/facts", { data: { ...base, statement: "接口总数为 236 个。" } });
  expect(bad.status()).toBe(400);
  expect((await bad.json()).error).toContain("236");
  const good = await request.post("/api/facts", { data: base });
  expect(good.status()).toBe(201);
  const { facts } = await good.json();
  const review = await request.patch("/api/facts", { data: { id: facts[0].id, action: "approve", reviewer: "测试审核人" } });
  expect(review.status()).toBe(400);
  expect((await review.json()).error).toContain("B 级");
});

test("a chat URL opens brand source capture with the URL prefilled", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("引导 · okdata · 会话已保存")).toBeVisible();
  const link = "https://okdata.online/llms.txt";
  await page.getByRole("textbox", { name: "消息内容" }).fill("请采集 okdata.online/llms.txt。");
  await page.getByRole("button", { name: "发送消息", exact: true }).click();
  await page.getByRole("link", { name: "用官网链接建立来源快照" }).last().click();
  await expect(page).toHaveURL(/\/work\/brand\?url=/);
  await expect(page.getByRole("textbox", { name: "官网链接" })).toHaveValue(link);
});

test("a text file fills the material form before saving its snapshot", async ({ page }) => {
  await page.goto("/work/brand");
  await expect(page.getByRole("heading", { name: "来源快照" })).toBeVisible();
  const content = "这是用户提供的产品材料。数据仅用于测试文件读取与快照保存。";
  await page.locator('input[type="file"]').setInputFiles({ name: "product-notes.txt", mimeType: "text/plain", buffer: Buffer.from(content) });
  await expect(page.getByRole("textbox", { name: "材料标题" })).toHaveValue("product-notes.txt");
  await expect(page.getByRole("textbox", { name: "材料正文" })).toHaveValue(content);
  await page.getByRole("button", { name: "保存 B 级来源" }).click();
  await expect(page.getByRole("textbox", { name: "快照正文（只读，可复制引文）" })).toHaveValue(content);
});
