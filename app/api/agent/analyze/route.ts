import { getConversationStore, getGeoBindings } from "@/lib/db";
import { sourceRepository } from "@/lib/sources";
import { factRepository } from "@/lib/db/facts";
import { extractFactCandidates, modelConfigured } from "@/lib/agent/fact-extraction";
import { officialLink } from "@/lib/conversation";
import { json, readJson, sameOrigin } from "@/lib/api";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: "请在当前工作台操作。" }, 403);
  let input: unknown;
  try { input = await readJson(request, 2048); }
  catch (error) { return json({ error: (error as Error).message }, 400); }
  if (!input || typeof input !== "object" || !("messageId" in input) || typeof input.messageId !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(input.messageId)) return json({ error: "请选择一条包含官网链接的消息。" }, 400);
  const messageId = input.messageId;
  try {
    const store = await getConversationStore();
    const message = await store.findUserMessage(messageId);
    const url = message && officialLink(message.text);
    if (!url) return json({ error: "消息中没有可采集的 okdata 官网链接。" }, 400);
    const claim = await store.claimAnalysis(messageId);
    if (claim === "complete") return json(await store.history());
    if (claim === "running") return json({ error: "这条消息正在采集，请稍后刷新会话。" }, 409);
    try {
      const { db, bucket } = await getGeoBindings();
      const source = await sourceRepository(db, bucket).capture({ kind: "official", url });
      if (!modelConfigured()) {
        return json(await store.finishAnalysis(messageId,
          `官网来源已保存：${source.url}\n快照 ID：${source.id}\n当前未配置模型。请在品牌设置查看快照并手工建立事实草稿。`, source.id));
      }
      try {
        const candidates = await extractFactCandidates(source.id, source.text);
        const saved = candidates.length ? await factRepository(db, bucket).create(source.id, candidates) : [];
        const lines = saved.map((fact) => `• ${fact.statement.slice(0, 300)}\n  原文：${fact.quote.slice(0, 240)}`);
        return json(await store.finishAnalysis(messageId,
          `官网来源已保存：${source.url}\n快照 ID：${source.id}\nPi Agent 生成 ${saved.length} 条待审核事实候选。${lines.length ? `\n${lines.join("\n")}` : "\n当前没有通过原文校验的候选，请人工录入。"}\n请在品牌设置确认后再生效。`, source.id));
      } catch (error) {
        console.error("Pi fact analysis failed:", error);
        return json(await store.finishAnalysis(messageId,
          `官网来源已保存：${source.url}\n快照 ID：${source.id}\nPi Agent 抽取失败：${error instanceof Error ? error.message.slice(0, 300) : "未知错误"}\n请在品牌设置手工建立事实草稿。`, source.id));
      }
    } catch (error) {
      await store.failAnalysis(messageId, error instanceof Error ? error.message : "未知错误");
      throw error;
    }
  } catch (error) {
    console.error("Analyze conversation link failed:", error);
    return json({ error: error instanceof Error ? error.message.slice(0, 300) : "来源采集失败，请重试。" }, 503);
  }
}
