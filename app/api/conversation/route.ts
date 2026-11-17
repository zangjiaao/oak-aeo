import { getConversationStore } from "@/lib/db";
import { MessageConflictError } from "@/lib/db/conversations";
import { isSendMessage } from "@/lib/conversation";

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function unavailable(error: unknown) {
  console.error("Conversation storage unavailable:", error);
  return json({ error: "会话存储暂不可用，请重试；若尚未初始化数据库，请先运行 npm run db:migrate。" }, 503);
}

export async function GET(request: Request) {
  // Reading the request keeps this handler request-time under cacheComponents.
  new URL(request.url);
  try {
    return json(await (await getConversationStore()).history());
  } catch (error) {
    return unavailable(error);
  }
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  let sameOrigin = true;
  if (origin) {
    try {
      const source = new URL(origin);
      // Next may normalize request.url to localhost behind its Node server.
      sameOrigin = ["http:", "https:"].includes(source.protocol) && source.host === request.headers.get("host");
    } catch { sameOrigin = false; }
  }
  if (!sameOrigin || request.headers.get("sec-fetch-site") === "cross-site") {
    return json({ error: "请在当前工作台发送消息。" }, 403);
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return json({ error: "消息需要使用 JSON 格式。" }, 415);
  }
  // Bound the body before parsing, including chunked requests without Content-Length.
  const reader = request.body?.getReader();
  if (!reader) return json({ error: "请输入消息。" }, 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 65536) {
      await reader.cancel();
      return json({ error: "消息过长，请分段发送（每条最多 8000 字符）。" }, 413);
    }
    chunks.push(value);
  }
  let input: unknown;
  try {
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    input = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return json({ error: "消息格式有误，请重试。" }, 400);
  }
  if (!isSendMessage(input)) {
    return json({ error: "请输入 1–8000 字符的消息，并使用有效的消息 ID。" }, 400);
  }
  try {
    return json(await (await getConversationStore()).append(input));
  } catch (error) {
    if (error instanceof MessageConflictError) return json({ error: error.message }, 409);
    return unavailable(error);
  }
}
