export const CONVERSATION_ID = "okdata-onboarding";
export const MAX_MESSAGE_LENGTH = 8000;
export const WELCOME_MESSAGE = "你的产品，用一句话说是什么？也可以贴官网链接。口述会先记录为待处理消息，不会直接成为可引用事实。";

export type ConversationMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
  status: "complete" | "pending_agent";
  createdAt: string;
};

export type ConversationHistory = {
  id: string;
  title: string;
  messages: ConversationMessage[];
};

export type SendMessage = { id: string; text: string };

export function isSendMessage(value: unknown): value is SendMessage {
  if (!value || typeof value !== "object") return false;
  const input = value as Record<string, unknown>;
  return typeof input.id === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.id) &&
    typeof input.text === "string" && input.text.trim().length > 0 &&
    input.text.length <= MAX_MESSAGE_LENGTH &&
    Object.keys(input).every((key) => key === "id" || key === "text");
}
