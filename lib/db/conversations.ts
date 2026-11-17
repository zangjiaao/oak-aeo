import { asc, eq } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { CONVERSATION_ID, WELCOME_MESSAGE, type ConversationHistory, type SendMessage } from "../conversation";
import { conversations, messages, agentActions } from "./schema";

export class MessageConflictError extends Error {}

export function conversationRepository(db: DrizzleD1Database<Record<string, unknown>>) {
  async function initialize() {
    const now = new Date().toISOString();
    // D1 batch is atomic; concurrent first visits cannot duplicate the welcome.
    await db.batch([
      db.insert(conversations).values({ id: CONVERSATION_ID, title: "引导 · okdata", createdAt: now }).onConflictDoNothing(),
      db.insert(messages).values({
        id: `${CONVERSATION_ID}-welcome`, conversationId: CONVERSATION_ID,
        role: "assistant", text: WELCOME_MESSAGE, status: "complete", createdAt: now,
      }).onConflictDoNothing(),
    ]);
  }

  async function history(): Promise<ConversationHistory> {
    await initialize();
    const rows = await db.select({
      id: messages.id, role: messages.role, text: messages.text,
      status: messages.status, createdAt: messages.createdAt,
    }).from(messages).where(eq(messages.conversationId, CONVERSATION_ID)).orderBy(asc(messages.sequence));
    return { id: CONVERSATION_ID, title: "引导 · okdata", messages: rows };
  }

  async function append(input: SendMessage) {
    await initialize();
    await db.insert(messages).values({
      id: input.id, conversationId: CONVERSATION_ID, role: "user",
      text: input.text.trim(), status: "pending_agent", createdAt: new Date().toISOString(),
    }).onConflictDoNothing();
    const [saved] = await db.select().from(messages).where(eq(messages.id, input.id));
    if (!saved || saved.conversationId !== CONVERSATION_ID || saved.text !== input.text.trim()) {
      throw new MessageConflictError("消息 ID 已用于另一条消息，请刷新后重试。");
    }
    return history();
  }

  async function findUserMessage(id: string) {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message?.conversationId === CONVERSATION_ID && message.role === "user" ? message : null;
  }

  async function claimAnalysis(messageId: string) {
    const now = new Date().toISOString();
    const inserted = await db.insert(agentActions).values({ messageId, status: "running", startedAt: now })
      .onConflictDoNothing().returning({ messageId: agentActions.messageId });
    if (inserted.length) return "claimed" as const;
    const [action] = await db.select().from(agentActions).where(eq(agentActions.messageId, messageId));
    if (action?.status === "complete") return "complete" as const;
    if (action?.status === "running" && Date.now() - Date.parse(action.startedAt) < 60_000) return "running" as const;
    await db.update(agentActions).set({ status: "running", startedAt: now, completedAt: null, error: null })
      .where(eq(agentActions.messageId, messageId));
    return "claimed" as const;
  }

  async function finishAnalysis(messageId: string, response: string, sourceId: string) {
    const now = new Date().toISOString();
    await db.batch([
      db.insert(messages).values({ id: `fact-analysis-${messageId}`, conversationId: CONVERSATION_ID,
        role: "assistant", text: response, status: "complete", createdAt: now }).onConflictDoNothing(),
      db.update(agentActions).set({ status: "complete", sourceId, completedAt: now }).where(eq(agentActions.messageId, messageId)),
    ]);
    return history();
  }

  async function failAnalysis(messageId: string, error: string) {
    await db.update(agentActions).set({ status: "failed", error, completedAt: new Date().toISOString() })
      .where(eq(agentActions.messageId, messageId));
  }

  return { history, append, findUserMessage, claimAnalysis, finishAnalysis, failAnalysis };
}
