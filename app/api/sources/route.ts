import { getGeoBindings } from "@/lib/db";
import { sourceRepository, SourceError } from "@/lib/sources";
import { factRepository } from "@/lib/db/facts";
import { extractFactCandidates, modelConfigured } from "@/lib/agent/fact-extraction";
import { json, readJson, sameOrigin } from "@/lib/api";

export async function GET(request: Request) {
  new URL(request.url);
  try {
    const { db, bucket } = await getGeoBindings();
    return json({ sources: await sourceRepository(db, bucket).list(), modelConfigured: modelConfigured() });
  } catch (error) {
    console.error("List sources failed:", error);
    return json({ error: "无法读取来源，请确认已运行 npm run db:migrate。" }, 503);
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: "请在当前工作台操作。" }, 403);
  let payload: unknown;
  try { payload = await readJson(request); }
  catch (error) { return json({ error: (error as Error).message }, 400); }
  if (!payload || typeof payload !== "object" || !("kind" in payload)) return json({ error: "请选择官网链接或用户材料。" }, 400);
  let input: { kind: "official"; url: string } | { kind: "material"; title: string; text: string };
  if (payload.kind === "official" && "url" in payload && typeof payload.url === "string" && payload.url.length < 2000) {
    input = { kind: "official", url: payload.url };
  } else if (payload.kind === "material" && "title" in payload && typeof payload.title === "string" && payload.title.trim().length > 0 &&
    payload.title.length <= 200 && "text" in payload && typeof payload.text === "string" && payload.text.trim().length >= 20 && payload.text.length <= 50_000) {
    input = { kind: "material", title: payload.title, text: payload.text };
  } else return json({ error: "来源输入无效。材料需有标题和 20–50000 字正文。" }, 400);
  try {
    const { db, bucket } = await getGeoBindings();
    const database = db;
    const source = await sourceRepository(database, bucket).capture(input);
    if (!modelConfigured()) return json({ source, candidates: [], extraction: "manual", message: "来源已保存。未配置模型，可在品牌设置手动建立事实草稿。" }, 201);
    try {
      const candidates = await extractFactCandidates(source.id, source.text);
      const saved = candidates.length ? await factRepository(database, bucket).create(source.id, candidates) : [];
      return json({ source, candidates: saved, extraction: "agent", message: saved.length ? `已生成 ${saved.length} 条待审核候选。` : "模型未找到满足口径与引文要求的候选，请人工录入。" }, 201);
    } catch (error) {
      console.error("Fact extraction failed:", error);
      return json({ source, candidates: [], extraction: "failed", message: `来源已保存；模型抽取失败：${error instanceof Error ? error.message : "请人工处理。"}` }, 201);
    }
  } catch (error) {
    if (error instanceof SourceError) return json({ error: error.message }, 400);
    console.error("Capture source failed:", error);
    return json({ error: "来源保存失败，请检查 D1/R2 本地绑定与迁移。" }, 503);
  }
}
