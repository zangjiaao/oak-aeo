import { getConversationStore } from "@/lib/db";
import { generateChatReply } from "@/lib/agent/chat";
import { modelConfigured } from "@/lib/agent/model";
import { json, readJson, sameOrigin } from "@/lib/api";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: "请在当前工作台发送消息。" }, 403);
  let input: unknown;
  try { input = await readJson(request, 2048); }
  catch (error) { return json({ error: (error as Error).message }, 400); }
  if (!input || typeof input !== "object" || !("messageId" in input) ||
    typeof input.messageId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.messageId)) {
    return json({ error: "请选择一条已发送的用户消息。" }, 400);
  }
  const messageId = input.messageId;
  try {
    const store = await getConversationStore();
    if (!await store.findUserMessage(messageId)) return json({ error: "用户消息不存在。" }, 404);
    const history = await store.history();
    const index = history.messages.findIndex((message) => message.id === messageId);
    if (history.messages.some((message) => message.id === `agent-reply-${messageId}`)) return json(history);
    if (!modelConfigured()) return json({ error: "Pi Agent 尚未配置。请在项目 .env.local 填写 DeepSeek 模型地址、ID 和 API Key，重启服务后到系统设置测试连接。消息已保存，可稍后点击「让 Agent 回复」。" }, 409);
    const claim = await store.claimReply(messageId);
    if (claim === "complete") return json(await store.history());
    if (claim === "running") return json({ error: "Agent 正在回复这条消息，请稍后刷新会话。" }, 409);
    try {
      const response = await generateChatReply(history.messages.slice(0, index + 1));
      return json(await store.finishReply(messageId, response));
    } catch (error) {
      console.error("Pi conversation failed:", error);
      await store.failReply(messageId, error instanceof Error ? error.message : "未知错误");
      return json({ error: `Agent 回复失败：${error instanceof Error ? error.message.slice(0, 240) : "请检查模型连接后重试。"}` }, 502);
    }
  } catch (error) {
    console.error("Agent conversation storage failed:", error);
    return json({ error: "会话服务暂不可用，请刷新后重试。" }, 503);
  }
}
