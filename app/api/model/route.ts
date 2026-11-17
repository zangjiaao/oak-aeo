import { extractFactCandidates, modelConfigured } from "@/lib/agent/fact-extraction";
import { json, sameOrigin } from "@/lib/api";

export async function GET(request: Request) {
  new URL(request.url);
  const missing = ["GEO_MODEL_BASE_URL", "GEO_MODEL_ID", "GEO_MODEL_API_KEY"]
    .filter((name) => !process.env[name]);
  let endpoint: string | null = null;
  try { if (process.env.GEO_MODEL_BASE_URL) endpoint = new URL(process.env.GEO_MODEL_BASE_URL).origin; }
  catch { endpoint = "地址格式无效"; }
  return json({
    configured: modelConfigured(),
    model: process.env.GEO_MODEL_ID || null,
    endpoint,
    missing,
  });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: "请在当前工作台测试模型。" }, 403);
  if (!modelConfigured()) return json({ error: "模型环境变量不完整。请先配置 .env.local 并重启开发服务。" }, 409);
  try {
    const started = Date.now();
    await extractFactCandidates("connection-check", "测试产品仅提供 3 个接口。适用于测试环境，不代表正式产品。");
    return json({ connected: true, model: process.env.GEO_MODEL_ID, latencyMs: Date.now() - started });
  } catch (error) {
    console.error("Model connection check failed:", error);
    return json({ error: `模型测试失败：${error instanceof Error ? error.message.slice(0, 300) : "请检查地址、模型 ID 和密钥。"}` }, 502);
  }
}
