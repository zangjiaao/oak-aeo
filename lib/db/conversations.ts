import { asc, eq } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { CONVERSATION_ID, WELCOME_MESSAGE, type ConversationHistory, type SendMessage } from "../conversation";
import { conversations, messages } from "./schema";

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

  return { history, append };
}
