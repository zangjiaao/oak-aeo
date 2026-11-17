import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { generateChatReply } from "../lib/agent/chat";
import type { ConversationMessage } from "../lib/conversation";

test("Pi Agent replies to normal chat with earlier turns as context", async () => {
  const bodies: string[] = [];
  const server = createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += chunk;
    bodies.push(body);
    const payload = "记得，你介绍的是数据接口产品。主要服务哪些客户？";
    response.writeHead(200, { "content-type": "text/event-stream" });
    response.write(`data: ${JSON.stringify({ id: "chatcmpl-chat", object: "chat.completion.chunk", created: 1, model: "mock-chat", choices: [{ index: 0, delta: { role: "assistant", content: payload }, finish_reason: null }] })}\n\n`);
    response.write(`data: ${JSON.stringify({ id: "chatcmpl-chat", object: "chat.completion.chunk", created: 1, model: "mock-chat", choices: [{ index: 0, delta: {}, finish_reason: "stop" }] })}\n\n`);
    response.end("data: [DONE]\n\n");
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("mock listener unavailable");
  const old = [process.env.GEO_MODEL_BASE_URL, process.env.GEO_MODEL_ID, process.env.GEO_MODEL_API_KEY];
  process.env.GEO_MODEL_BASE_URL = `http://127.0.0.1:${address.port}/v1`;
  process.env.GEO_MODEL_ID = "mock-chat";
  process.env.GEO_MODEL_API_KEY = "test-only-key";
  const messages: ConversationMessage[] = [
    { id: "one", role: "user", text: "我们做数据接口产品。", status: "pending_agent", createdAt: "2026-01-01T00:00:00.000Z" },
    { id: "two", role: "assistant", text: "主要服务哪些客户？", status: "complete", createdAt: "2026-01-01T00:00:01.000Z" },
    { id: "three", role: "user", text: "还记得我做什么吗？", status: "pending_agent", createdAt: "2026-01-01T00:00:02.000Z" },
  ];
  try {
    const reply = await generateChatReply(messages);
    assert.equal(reply, "记得，你介绍的是数据接口产品。主要服务哪些客户？");
    assert.equal(bodies.length, 1);
    assert.match(bodies[0], /我们做数据接口产品/);
    assert.match(bodies[0], /主要服务哪些客户/);
    assert.match(bodies[0], /还记得我做什么吗/);
    assert.match(bodies[0], /chat.completions|messages/);
  } finally {
    [process.env.GEO_MODEL_BASE_URL, process.env.GEO_MODEL_ID, process.env.GEO_MODEL_API_KEY] = old;
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
