import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { drizzle } from "drizzle-orm/d1";
import { getPlatformProxy, unstable_splitSqlQuery } from "wrangler";
import { conversationRepository, MessageConflictError } from "../lib/db/conversations";
import { isSendMessage, MAX_MESSAGE_LENGTH } from "../lib/conversation";

let path: string;
before(async () => { path = await mkdtemp(join(tmpdir(), "oak-conversation-test-")); });
let proxy: Awaited<ReturnType<typeof getPlatformProxy<{ DB: Parameters<typeof drizzle>[0] }>>> | undefined;
after(async () => {
  await proxy?.dispose();
  await rm(path, { recursive: true, force: true });
});

async function open() {
  proxy = await getPlatformProxy<{ DB: Parameters<typeof drizzle>[0] }>({
    configPath: "wrangler.jsonc", remoteBindings: false, persist: { path },
  });
  return { binding: proxy.env.DB, repository: conversationRepository(drizzle(proxy.env.DB)) };
}

test("validates messages without accepting forged role/status, blank or oversized input", () => {
  const id = crypto.randomUUID();
  assert.equal(isSendMessage({ id, text: "你好" }), true);
  for (const value of [null, {}, { id: "welcome", text: "text" }, { id, text: " \n " },
    { id, text: "a".repeat(MAX_MESSAGE_LENGTH + 1) }, { id, text: "text", role: "assistant" },
    { id, text: "text", status: "complete" }]) {
    assert.equal(isSendMessage(value), false);
  }
});

test("D1 persists one shared conversation, atomically deduplicates retries and survives restart", async () => {
  const { binding, repository } = await open();
  const migration = await readFile("migrations/0001_conversations.sql", "utf8");
  await binding.batch(unstable_splitSqlQuery(migration).map((sql) => binding.prepare(sql)));
  const initial = await Promise.all([repository.history(), repository.history()]);
  assert.equal(initial[0].messages.length, 1);
  assert.equal(initial[1].messages.length, 1);
  const message = { id: crypto.randomUUID(), text: "okdata 是公开社媒数据 API。\n官网：https://okdata.online" };
  await Promise.all([repository.append(message), repository.append(message)]);
  const second = { id: crypto.randomUUID(), text: "  按次计费  " };
  const history = await repository.append(second);
  assert.equal(history.messages.length, 3);
  assert.deepEqual(history.messages.map((m) => m.status), ["complete", "pending_agent", "pending_agent"]);
  assert.equal(history.messages[1].text, message.text);
  assert.equal(history.messages[2].text, "按次计费");
  await assert.rejects(repository.append({ ...message, text: "不同消息" }), MessageConflictError);
  await proxy!.dispose();
  proxy = undefined;
  const reopened = await open();
  assert.deepEqual(await reopened.repository.history(), history);
});
