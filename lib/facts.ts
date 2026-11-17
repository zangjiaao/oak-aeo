export type SourceKind = "official" | "material";
export type FactStatus = "draft" | "approved" | "rejected" | "conflict";
export type FactInput = {
  sourceId: string;
  topic: string;
  statement: string;
  quote: string;
  scope: string;
  boundary: string;
};

export function validateFactInput(value: unknown): value is FactInput {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  return ["sourceId", "topic", "statement", "quote", "scope", "boundary"].every((key) =>
    typeof data[key] === "string" && (data[key] as string).trim().length > 0 && (data[key] as string).length <= (key === "quote" ? 1500 : 600));
}

export function extractNumbers(text: string) {
  return [...text.matchAll(/(?<![\w.])\d[\d,.]*(?:%|％)?/g)].map((item) => item[0]);
}

export function validateEvidence(input: FactInput, sourceText: string) {
  if (!sourceText.includes(input.quote.trim())) return "引文必须与来源快照中的原文完全一致。";
  const quoted = extractNumbers(input.quote);
  const missing = extractNumbers(input.statement).filter((number) => !quoted.includes(number));
  if (missing.length) return `陈述中的数字 ${missing.join("、")} 不在引文中。`;
  return null;
}
