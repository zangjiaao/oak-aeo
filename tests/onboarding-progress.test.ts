import { test } from "node:test";
import assert from "node:assert/strict";
import { onboardingStep } from "../lib/onboarding-progress";
import type { ConversationHistory } from "../lib/conversation";

test("guide progress follows saved sources and approved facts, not chat length", () => {
  const history: ConversationHistory = { id: "test", title: "test", messages: [
    { id: "1", role: "user", text: "你好", status: "pending_agent", createdAt: "2026-01-01" },
  ] };
  assert.equal(onboardingStep(history, 0, 0), 0);
  history.messages.push({ id: "2", role: "user", text: "https://okdata.online/zh/", status: "pending_agent", createdAt: "2026-01-01" });
  assert.equal(onboardingStep(history, 0, 0), 1);
  assert.equal(onboardingStep(null, 1, 0), 1);
  assert.equal(onboardingStep(history, 1, 29), 1);
  assert.equal(onboardingStep(history, 1, 30), 2);
});
