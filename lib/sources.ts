import { createHash } from "node:crypto";
import { convert } from "html-to-text";
import { desc, eq } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import type { SnapshotBucket } from "./db";
import { rawSources } from "./db/schema";

export class SourceError extends Error {}

function officialUrl(value: string) {
  let url: URL;
  try { url = new URL(value); } catch { throw new SourceError("请输入完整的 HTTPS 官网链接。"); }
  if (url.protocol !== "https:" || !["okdata.online", "www.okdata.online"].includes(url.hostname) ||
    url.port || url.username || url.password) throw new SourceError("当前只允许抓取 okdata.online 的 HTTPS 页面。");
  url.hash = "";
  return url;
}

async function fetchOfficial(value: string) {
  let url = officialUrl(value);
  for (let hop = 0; hop < 4; hop++) {
    const response = await fetch(url, {
      redirect: "manual", signal: AbortSignal.timeout(12000),
      headers: { "User-Agent": "okdata-GEO-fact-snapshot/1.0" },
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new SourceError("官网重定向缺少目标地址。");
      url = officialUrl(new URL(location, url).toString());
      continue;
    }
    if (!response.ok) throw new SourceError(`官网返回 HTTP ${response.status}，请稍后重试或粘贴材料。`);
    const contentType = response.headers.get("content-type")?.split(";")[0].toLowerCase() || "";
    if (!["text/html", "text/plain", "text/markdown", "text/x-markdown"].includes(contentType)) {
      throw new SourceError("该链接不是可读取的网页或文本。");
    }
    const body = response.body;
    if (!body) throw new SourceError("官网返回了空内容。");
    const reader = body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 512_000) { await reader.cancel(); throw new SourceError("网页超过 500KB，请选择具体文档页。"); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const raw = new TextDecoder().decode(bytes);
    const text = contentType === "text/html" ? convert(raw, {
      wordwrap: false,
      selectors: [{ selector: "script", format: "skip" }, { selector: "style", format: "skip" }, { selector: "nav", format: "skip" }, { selector: "footer", format: "skip" }],
    }) : raw;
    if (!text.trim()) throw new SourceError("网页没有可引用的正文，请选择其他页面。");
    return { url: url.toString(), rawBytes: bytes, text, contentType };
  }
  throw new SourceError("官网重定向过多。");
}

export function sourceRepository(db: DrizzleD1Database<Record<string, unknown>>, bucket: SnapshotBucket) {
  async function list() {
    return db.select({ id: rawSources.id, kind: rawSources.kind, url: rawSources.url, title: rawSources.title,
      contentType: rawSources.contentType, sha256: rawSources.sha256, capturedAt: rawSources.capturedAt })
      .from(rawSources).orderBy(desc(rawSources.capturedAt));
  }
  async function detail(id: string) {
    const [source] = await db.select().from(rawSources).where(eq(rawSources.id, id));
    if (!source) throw new SourceError("来源不存在。");
    const snapshot = await bucket.get(source.textKey);
    if (!snapshot) throw new SourceError("来源快照缺失，事实不可审核。");
    const text = await snapshot.text();
    return { source, text };
  }
  async function capture(input: { kind: "official"; url: string } | { kind: "material"; title: string; text: string }) {
    const captured = input.kind === "official" ? await fetchOfficial(input.url) : {
      url: null, rawBytes: new TextEncoder().encode(input.text), text: input.text, contentType: "text/plain",
    };
    const id = crypto.randomUUID();
    const sha256 = createHash("sha256").update(captured.rawBytes).digest("hex");
    const rawKey = `raw/${id}`;
    const textKey = `text/${id}`;
    await bucket.put(rawKey, captured.rawBytes, { httpMetadata: { contentType: captured.contentType } });
    try {
      await bucket.put(textKey, captured.text, { httpMetadata: { contentType: "text/plain; charset=utf-8" } });
      const now = new Date().toISOString();
      const title = input.kind === "official" ? new URL(captured.url!).pathname || "/" : input.title.trim();
      await db.insert(rawSources).values({ id, kind: input.kind, url: captured.url, title, contentType: captured.contentType,
        sha256, rawKey, textKey, capturedAt: now });
      return { id, kind: input.kind, url: captured.url, title, contentType: captured.contentType, sha256, capturedAt: now, text: captured.text };
    } catch (error) {
      await Promise.allSettled([bucket.delete(rawKey), bucket.delete(textKey)]);
      throw error;
    }
  }
  return { list, detail, capture };
}
