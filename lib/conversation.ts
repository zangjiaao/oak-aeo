export const CONVERSATION_ID = "okdata-onboarding";
export const MAX_MESSAGE_LENGTH = 8000;
export const WELCOME_MESSAGE = "你好，我是 okdata 的 GEO 助手。先用一句话介绍你的产品，或贴官网链接；我会继续追问。未经核验的口述不会直接成为可引用事实。";

export function officialLink(text: string) {
  const match = text.match(/(?<![\w.-])(?:https:\/\/)?(?:www\.)?okdata\.online(?:\/[^\s，。；;)]*)?/i);
  if (!match) return null;
  const candidate = match[0].replace(/[),，。；;]+$/, "");
  return candidate.startsWith("https://") ? candidate : `https://${candidate}`;
}

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
