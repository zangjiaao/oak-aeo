import { officialLink, type ConversationHistory } from "./conversation";

// Only persisted business evidence advances the guide. Later stages have no
// backing objects yet and must not appear complete because the chat is long.
export function onboardingStep(history: ConversationHistory | null, sourceCount: number, approvedFacts: number) {
  if (approvedFacts >= 30) return 2;
  if (sourceCount > 0 || history?.messages.some((message) => message.role === "user" && officialLink(message.text))) return 1;
  return 0;
}
