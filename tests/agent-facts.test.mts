import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { extractFactCandidates } from "../lib/agent/fact-extraction";

test("configured pi agent extracts only exact, supportable source quotes", async () => {
  const requests: string[] = [];
  const server = createServer(async (request, response) => {
    requests.push(request.url || "");
    for await (const chunk of request) { void chunk; }
    const payload = JSON.stringify({ facts: [
      { topic: "接口数量", statement: "接口总数为 235 个。", quote: "接口总数为 235 个。", scope: "当前文档", boundary: "以后可能变化", confidence: 0.9 },
      { topic: "编造数字", statement: "接口总数为 999 个。", quote: "接口总数为 235 个。", scope: "当前文档", boundary: "以后可能变化", confidence: 0.9 },
    ] });
    response.writeHead(200, { "content-type": "text/event-stream" });
    response.write(`data: ${JSON.stringify({ id: "chatcmpl-test", object: "chat.completion.chunk", created: 1, model: "mock-facts", choices: [{ index: 0, delta: { role: "assistant", content: payload }, finish_reason: null }] })}\n\n`);
    response.write(`data: ${JSON.stringify({ id: "chatcmpl-test", object: "chat.completion.chunk", created: 1, model: "mock-facts", choices: [{ index: 0, delta: {}, finish_reason: "stop" }] })}\n\n`);
    response.end("data: [DONE]\n\n");
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("mock listener unavailable");
  const old = [process.env.GEO_MODEL_BASE_URL, process.env.GEO_MODEL_ID, process.env.GEO_MODEL_API_KEY];
  process.env.GEO_MODEL_BASE_URL = `http://127.0.0.1:${address.port}/v1`;
  process.env.GEO_MODEL_ID = "mock-facts";
  process.env.GEO_MODEL_API_KEY = "test-only-key";
  try {
    const facts = await extractFactCandidates("test-source", "接口总数为 235 个。适用当前文档，以后可能变化。");
    assert.equal(facts.length, 1);
    assert.equal(facts[0].statement, "接口总数为 235 个。");
    assert.ok(requests.some((url) => url.endsWith("/chat/completions")));
  } finally {
    [process.env.GEO_MODEL_BASE_URL, process.env.GEO_MODEL_ID, process.env.GEO_MODEL_API_KEY] = old;
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
