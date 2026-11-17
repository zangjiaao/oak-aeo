import { and, desc, eq, ne } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { factBlocks, factVersions, rawSources } from "./schema";
import { validateEvidence, type FactInput } from "../facts";
import type { SnapshotBucket } from ".";

export class FactError extends Error {}

type Candidate = Omit<FactInput, "sourceId"> & { confidence?: number | null };

export function factRepository(db: DrizzleD1Database<Record<string, unknown>>, bucket: SnapshotBucket) {
  async function list() {
    return db.select({
      id: factBlocks.id, sourceId: factBlocks.sourceId, topic: factBlocks.topic,
      statement: factBlocks.statement, quote: factBlocks.quote, scope: factBlocks.scope,
      boundary: factBlocks.boundary, confidence: factBlocks.confidence,
      tier: factBlocks.tier, status: factBlocks.status, version: factBlocks.version,
      decidedBy: factBlocks.decidedBy, decidedAt: factBlocks.decidedAt,
      updatedAt: factBlocks.updatedAt, sourceTitle: rawSources.title, sourceUrl: rawSources.url,
    }).from(factBlocks).innerJoin(rawSources, eq(factBlocks.sourceId, rawSources.id))
      .orderBy(desc(factBlocks.updatedAt));
  }

  async function sourceText(sourceId: string) {
    const [source] = await db.select().from(rawSources).where(eq(rawSources.id, sourceId));
    if (!source) throw new FactError("来源不存在。");
    const object = await bucket.get(source.textKey);
    if (!object) throw new FactError("来源快照缺失，无法保存或审核事实。");
    return { source, text: await object.text() };
  }

  async function create(sourceId: string, candidates: Candidate[]) {
    const { source, text } = await sourceText(sourceId);
    const saved = [];
    for (const candidate of candidates) {
      const input = { ...candidate, sourceId };
      const issue = validateEvidence(input, text);
      if (issue) throw new FactError(issue);
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      const row = {
        id, sourceId, topic: candidate.topic.trim(), statement: candidate.statement.trim(),
        quote: candidate.quote.trim(), scope: candidate.scope.trim(), boundary: candidate.boundary.trim(),
        confidence: candidate.confidence ?? null, tier: source.kind === "official" ? "A" as const : "B" as const,
        status: "draft" as const, version: 1, createdAt: now, updatedAt: now,
      };
      await db.batch([
        db.insert(factBlocks).values(row),
        db.insert(factVersions).values({ factId: id, version: 1, topic: row.topic, statement: row.statement, quote: row.quote,
          scope: row.scope, boundary: row.boundary, status: row.status, changedAt: now }),
      ]);
      saved.push(row);
    }
    return saved;
  }

  async function versions(id: string) {
    return db.select().from(factVersions).where(eq(factVersions.factId, id)).orderBy(desc(factVersions.version));
  }

  async function change(id: string, input: Candidate, action: "edit" | "approve" | "reject" | "resolve", reviewer?: string) {
    const [current] = await db.select().from(factBlocks).where(eq(factBlocks.id, id));
    if (!current) throw new FactError("事实不存在。");
    const { source, text } = await sourceText(current.sourceId);
    const next = action === "edit" ? input : current;
    const issue = validateEvidence({ ...next, sourceId: current.sourceId }, text);
    if (issue) throw new FactError(issue);
    if ((action === "approve" || action === "resolve") && source.kind !== "official") {
      throw new FactError("B 级用户材料不能审核为对外生效事实。请先补官网出处。");
    }
    if (["approve", "reject", "resolve"].includes(action) && !reviewer?.trim()) {
      throw new FactError("请填写裁决人，保留审核记录。");
    }
    if (action === "edit" && current.status === "approved") throw new FactError("生效事实不能直接改写。请先建立新的事实候选。");
    const competing = await db.select().from(factBlocks).where(and(eq(factBlocks.topic, next.topic.trim()),
      eq(factBlocks.status, "approved"), ne(factBlocks.id, id)));
    if (action === "approve" && competing.length) {
      throw new FactError("同主题已有生效事实。请核对两条引文，选择「裁决为生效」以保留冲突记录。");
    }
    if (action === "resolve" && !competing.length) throw new FactError("没有同主题生效事实需要裁决。");
    const now = new Date().toISOString();
    const nextStatus = action === "edit" ? "draft" as const : action === "reject" ? "rejected" as const : "approved" as const;
    const version = current.version + 1;
    const update = db.update(factBlocks).set({
      topic: next.topic.trim(), statement: next.statement.trim(), quote: next.quote.trim(),
      scope: next.scope.trim(), boundary: next.boundary.trim(),
      status: nextStatus, version, decidedBy: action === "edit" ? null : reviewer?.trim(),
      decidedAt: action === "edit" ? null : now, updatedAt: now,
    }).where(eq(factBlocks.id, id));
    const revision = db.insert(factVersions).values({ factId: id, version, topic: next.topic.trim(),
      statement: next.statement.trim(), quote: next.quote.trim(), scope: next.scope.trim(), boundary: next.boundary.trim(),
      status: nextStatus, decidedBy: action === "edit" ? null : reviewer?.trim(), changedAt: now });
    const statements = [update, revision];
    if (action === "resolve") {
      for (const old of competing) {
        statements.push(db.update(factBlocks).set({ status: "conflict", version: old.version + 1,
          decidedBy: reviewer!.trim(), decidedAt: now, updatedAt: now }).where(eq(factBlocks.id, old.id)) as typeof update);
        statements.push(db.insert(factVersions).values({ factId: old.id, version: old.version + 1, topic: old.topic,
          statement: old.statement, quote: old.quote, scope: old.scope, boundary: old.boundary,
          status: "conflict", decidedBy: reviewer!.trim(), changedAt: now }) as typeof revision);
      }
    }
    await db.batch(statements as [typeof update, ...typeof statements]);
    return (await list()).find((fact) => fact.id === id);
  }

  async function rollback(id: string, targetVersion: number, reviewer: string) {
    if (!reviewer.trim()) throw new FactError("请填写回退操作人。");
    const [current] = await db.select().from(factBlocks).where(eq(factBlocks.id, id));
    if (!current) throw new FactError("事实不存在。");
    const [target] = await db.select().from(factVersions).where(and(eq(factVersions.factId, id), eq(factVersions.version, targetVersion)));
    if (!target || targetVersion >= current.version) throw new FactError("请选择更早的有效版本。");
    const { source, text } = await sourceText(current.sourceId);
    const issue = validateEvidence({ sourceId: current.sourceId, topic: target.topic,
      statement: target.statement, quote: target.quote, scope: target.scope, boundary: target.boundary }, text);
    if (issue) throw new FactError(issue);
    if (target.status === "approved") {
      if (source.kind !== "official") throw new FactError("B 级来源不能回退为生效状态。");
      const other = await db.select({ id: factBlocks.id }).from(factBlocks).where(and(eq(factBlocks.topic, target.topic),
        eq(factBlocks.status, "approved"), ne(factBlocks.id, id)));
      if (other.length) throw new FactError("同主题有另一条生效事实，请先裁决冲突。");
    }
    const status = target.status as "draft" | "approved" | "rejected" | "conflict";
    const now = new Date().toISOString();
    const version = current.version + 1;
    await db.batch([
      db.update(factBlocks).set({ topic: target.topic, statement: target.statement, quote: target.quote,
        scope: target.scope, boundary: target.boundary, status, version,
        decidedBy: reviewer.trim(), decidedAt: now, updatedAt: now }).where(eq(factBlocks.id, id)),
      db.insert(factVersions).values({ factId: id, version, topic: target.topic, statement: target.statement,
        quote: target.quote, scope: target.scope, boundary: target.boundary,
        status, decidedBy: reviewer.trim(), changedAt: now }),
    ]);
    return (await list()).find((fact) => fact.id === id);
  }

  return { list, create, change, versions, rollback, sourceText };
}
