import { Agent } from "@earendil-works/pi-agent-core";
import { createModels, createProvider, envApiKeyAuth, type Model } from "@earendil-works/pi-ai";
import { openAICompletionsApi } from "@earendil-works/pi-ai/api/openai-completions.lazy";

export function modelConfigured() {
  return Boolean(process.env.GEO_MODEL_BASE_URL && process.env.GEO_MODEL_ID && process.env.GEO_MODEL_API_KEY);
}

export function createGeoAgent(systemPrompt: string) {
  if (!modelConfigured()) throw new Error("未配置模型。请在 .env.local 设置 GEO_MODEL_BASE_URL、GEO_MODEL_ID 和 GEO_MODEL_API_KEY。");
  const baseUrl = process.env.GEO_MODEL_BASE_URL!;
  const modelId = process.env.GEO_MODEL_ID!;
  const parsed = new URL(baseUrl);
  if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && ["localhost", "127.0.0.1"].includes(parsed.hostname))) {
    throw new Error("模型地址必须是 HTTPS，或本机 HTTP 地址。");
  }
  const model: Model<"openai-completions"> = {
    id: modelId, name: modelId, api: "openai-completions", provider: "geo-configured", baseUrl,
    reasoning: false, input: ["text"], cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128000, maxTokens: 2048,
  };
  const models = createModels();
  models.setProvider(createProvider({
    id: "geo-configured", name: "GEO configured model", baseUrl,
    auth: { apiKey: envApiKeyAuth("GEO model API key", ["GEO_MODEL_API_KEY"]) },
    models: [model], api: openAICompletionsApi(),
  }));
  return new Agent({
    initialState: { systemPrompt, model, thinkingLevel: "off" },
    streamFn: models.streamSimple.bind(models),
  });
}

export async function promptText(agent: Agent, prompt: string) {
  const timeout = setTimeout(() => agent.abort(), 45000);
  try {
    await agent.prompt(prompt);
    if (agent.state.errorMessage) throw new Error(agent.state.errorMessage);
    const last = agent.state.messages.at(-1);
    if (!last || last.role !== "assistant") throw new Error("模型没有返回回复，请重试。");
    const text = last.content.filter((item) => item.type === "text").map((item) => item.text).join("").trim();
    if (!text) throw new Error("模型返回了空回复，请重试。");
    return text;
  } finally {
    clearTimeout(timeout);
  }
}
