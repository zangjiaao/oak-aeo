import { getGeoBindings } from "@/lib/db";
import { factRepository, FactError } from "@/lib/db/facts";
import { validateFactInput } from "@/lib/facts";
import { json, readJson, sameOrigin } from "@/lib/api";

async function repository() {
  const { db, bucket } = await getGeoBindings();
  return factRepository(db, bucket);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  try {
    const repo = await repository();
    const versionId = url.searchParams.get("versions");
    return versionId ? json({ versions: await repo.versions(versionId) }) : json({ facts: await repo.list() });
  }
  catch (error) {
    console.error("List facts failed:", error);
    return json({ error: "无法读取事实块，请确认数据库迁移已完成。" }, 503);
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: "请在当前工作台操作。" }, 403);
  let payload: unknown;
  try { payload = await readJson(request); }
  catch (error) { return json({ error: (error as Error).message }, 400); }
  if (!validateFactInput(payload)) return json({ error: "请填写主题、陈述、原文引文、口径和边界。" }, 400);
  try { return json({ facts: await (await repository()).create(payload.sourceId, [payload]) }, 201); }
  catch (error) {
    if (error instanceof FactError) return json({ error: error.message }, 400);
    console.error("Create fact failed:", error);
    return json({ error: "事实保存失败。" }, 503);
  }
}

export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return json({ error: "请在当前工作台操作。" }, 403);
  let payload: unknown;
  try { payload = await readJson(request); }
  catch (error) { return json({ error: (error as Error).message }, 400); }
  if (!payload || typeof payload !== "object" || !("id" in payload) || typeof payload.id !== "string" ||
    !("action" in payload) || !["edit", "approve", "reject", "resolve", "rollback"].includes(String(payload.action))) {
    return json({ error: "审核动作无效。" }, 400);
  }
  const data = payload as Record<string, unknown>;
  if (data.action === "edit" && !validateFactInput(data.input)) return json({ error: "修改时需填写完整事实字段。" }, 400);
  try {
    const repo = await repository();
    const reviewer = typeof data.reviewer === "string" ? data.reviewer : "";
    const fact = data.action === "rollback"
      ? await repo.rollback(data.id as string, Number(data.version), reviewer)
      : await repo.change(data.id as string, data.input as Parameters<ReturnType<typeof factRepository>["change"]>[1],
        data.action as "edit" | "approve" | "reject" | "resolve", reviewer);
    return json({ fact });
  } catch (error) {
    if (error instanceof FactError) return json({ error: error.message }, 400);
    console.error("Review fact failed:", error);
    return json({ error: "审核保存失败。" }, 503);
  }
}
