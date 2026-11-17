import type { ConversationMessage } from "../conversation";
import { createGeoAgent, promptText } from "./model";

const SYSTEM_PROMPT = `你是 okdata GEO 工作台的对话 Agent。先直接回应用户的问题，再自然地推进产品信息收集；每次最多问一个明确的问题。引导用户说明产品、目标客户、使用场景和可核验的官网或文档。用户口述只能称为自述或待核验信息，不能称为已生效事实。不要编造官网内容、搜索结果、事实块、采样数据或已完成的操作。若用户给出 okdata 官网链接，可以提示采集和审核流程；只有会话里已有快照 ID 时才能说来源已保存。回复用简洁中文。`;

export async function generateChatReply(messages: ConversationMessage[]) {
  if (messages.at(-1)?.role !== "user") throw new Error("请先发送一条用户消息。");
  const context: { role: string; text: string }[] = [];
  let length = 0;
  for (const message of messages.slice(-24).reverse()) {
    const entry = { role: message.role, text: message.text.slice(0, 8000) };
    const size = JSON.stringify(entry).length;
    if (context.length && length + size > 16000) break;
    context.push(entry);
    length += size;
  }
  const agent = createGeoAgent(SYSTEM_PROMPT);
  const reply = await promptText(agent, `以下是同一会话中按时间排序的消息。请回复最后一条用户消息，结合之前的上下文，不要重复欢迎语。\n${JSON.stringify(context.reverse())}`);
  return reply.length > 7800 ? `${reply.slice(0, 7799)}…` : reply;
}
