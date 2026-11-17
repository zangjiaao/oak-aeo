import { getGeoBindings } from "@/lib/db";
import { sourceRepository, SourceError } from "@/lib/sources";
import { json } from "@/lib/api";

export async function GET(request: Request, context: RouteContext<"/api/sources/[id]">) {
  new URL(request.url);
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "来源 ID 无效。" }, 400);
  try {
    const { db, bucket } = await getGeoBindings();
    const { source, text } = await sourceRepository(db, bucket).detail(id);
    return json({ source, text });
  } catch (error) {
    if (error instanceof SourceError) return json({ error: error.message }, 404);
    console.error("Read source failed:", error);
    return json({ error: "无法读取快照。" }, 503);
  }
}
