import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { drizzle } from "drizzle-orm/d1";
import { getPlatformProxy, unstable_splitSqlQuery } from "wrangler";
import { sourceRepository, SourceError } from "../lib/sources";
import { factRepository, FactError } from "../lib/db/facts";
import { validateEvidence } from "../lib/facts";
import type { SnapshotBucket } from "../lib/db";

let path: string;
let proxy: Awaited<ReturnType<typeof getPlatformProxy<{ DB: Parameters<typeof drizzle>[0]; SNAPSHOTS: SnapshotBucket }>>>;
before(async () => { path = await mkdtemp(join(tmpdir(), "oak-facts-test-")); });
after(async () => { await proxy?.dispose(); await rm(path, { recursive: true, force: true }); });

test("official source is snapshotted in R2 and fact review preserves conflict and version history", async () => {
  proxy = await getPlatformProxy<{ DB: Parameters<typeof drizzle>[0]; SNAPSHOTS: SnapshotBucket }>({
    configPath: "wrangler.jsonc", remoteBindings: false, persist: { path },
  });
  const binding = proxy.env.DB;
  for (const file of ["migrations/0001_conversations.sql", "migrations/0002_sources_facts.sql"]) {
    const migration = await readFile(file, "utf8");
    await binding.batch(unstable_splitSqlQuery(migration).map((sql) => binding.prepare(sql)));
  }
  const db = drizzle(binding);
  const sources = sourceRepository(db, proxy.env.SNAPSHOTS);
  const facts = factRepository(db, proxy.env.SNAPSHOTS);
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("接口总数为 235 个。适用口径：当前官网文档。", { headers: { "content-type": "text/plain" } });
  try {
    await assert.rejects(sources.capture({ kind: "official", url: "http://127.0.0.1:8080/secret" }), SourceError);
    const source = await sources.capture({ kind: "official", url: "https://okdata.online/llms.txt" });
    assert.equal(source.kind, "official");
    assert.equal(source.sha256, createHash("sha256").update(new TextEncoder().encode(source.text)).digest("hex"));
    assert.equal((await sources.detail(source.id)).text, source.text);
    const raw = await proxy.env.SNAPSHOTS.get(`raw/${source.id}`);
    assert.equal(await raw?.text(), source.text);
    const firstInput = { topic: "接口数量", statement: "接口总数为 235 个。", quote: "接口总数为 235 个。",
      scope: "当前官网文档", boundary: "以本次快照为准" };
    assert.equal(validateEvidence({ ...firstInput, sourceId: source.id, statement: "接口总数为 236 个。" }, source.text), "陈述中的数字 236 不在引文中。");
    const [first] = await facts.create(source.id, [firstInput]);
    assert.equal(first.tier, "A");
    await facts.change(first.id, firstInput, "approve", "测试审核人");
    const [second] = await facts.create(source.id, [{ ...firstInput, statement: "235 个接口。" }]);
    await assert.rejects(facts.change(second.id, firstInput, "approve", "测试审核人"), FactError);
    await facts.change(second.id, firstInput, "resolve", "测试裁决人");
    const reviewed = await facts.list();
    assert.equal(reviewed.find((row) => row.id === first.id)?.status, "conflict");
    assert.equal(reviewed.find((row) => row.id === second.id)?.status, "approved");
    assert.equal((await facts.versions(second.id)).length, 2);
    await facts.rollback(second.id, 1, "测试回退人");
    assert.equal((await facts.list()).find((row) => row.id === second.id)?.status, "draft");
    assert.equal((await facts.versions(second.id)).length, 3);
    const material = await sources.capture({ kind: "material", title: "用户说明", text: "接口总数为 235 个。适用口径：用户说明。" });
    const [internal] = await facts.create(material.id, [firstInput]);
    assert.equal(internal.tier, "B");
    await assert.rejects(facts.change(internal.id, firstInput, "approve", "测试审核人"), FactError);
    await facts.change(internal.id, { ...firstInput, topic: "新主题" }, "edit");
    assert.equal((await facts.list()).find((row) => row.id === internal.id)?.topic, "新主题");
    await facts.rollback(internal.id, 1, "测试回退人");
    assert.equal((await facts.list()).find((row) => row.id === internal.id)?.topic, firstInput.topic);
  } finally { globalThis.fetch = oldFetch; }
});
