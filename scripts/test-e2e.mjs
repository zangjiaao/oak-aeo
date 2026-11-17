import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { once } from "node:events";

const state = mkdtempSync(join(tmpdir(), "oak-e2e-"));
let mock;
let playwright;
const forwardSignal = (signal) => { if (playwright && playwright.exitCode === null) playwright.kill(signal); };
process.on("SIGINT", forwardSignal);
process.on("SIGTERM", forwardSignal);
try {
  const migration = spawnSync("node_modules/.bin/wrangler", ["d1", "migrations", "apply", "DB", "--local", "--persist-to", state], { stdio: "inherit" });
  if (migration.status !== 0) process.exitCode = migration.status ?? 1;
  else {
    const env = { ...process.env, GEO_D1_PERSIST: join(state, "v3") };
    if (process.env.GEO_TEST_MODEL === "1") {
      mock = createServer(async (request, response) => {
        let raw = "";
        for await (const chunk of request) raw += chunk;
        const body = JSON.parse(raw);
        const prompt = JSON.stringify(body.messages || []);
        const text = prompt.includes("品牌事实抽取助手") ? '{"facts":[]}' :
          prompt.includes("第二轮") && prompt.includes("第一轮") ? "记得，你在第一轮介绍了数据接口产品。" :
            "你好，我是 okdata 的 GEO 助手。请介绍你的产品主要服务谁？";
        response.writeHead(200, { "content-type": "text/event-stream" });
        response.write(`data: ${JSON.stringify({ id: "chatcmpl-e2e", object: "chat.completion.chunk", created: 1, model: "mock-chat", choices: [{ index: 0, delta: { role: "assistant", content: text }, finish_reason: null }] })}\n\n`);
        response.write(`data: ${JSON.stringify({ id: "chatcmpl-e2e", object: "chat.completion.chunk", created: 1, model: "mock-chat", choices: [{ index: 0, delta: {}, finish_reason: "stop" }] })}\n\n`);
        response.end("data: [DONE]\n\n");
      });
      mock.listen(0, "127.0.0.1");
      await once(mock, "listening");
      env.GEO_MODEL_BASE_URL = `http://127.0.0.1:${mock.address().port}/v1`;
      env.GEO_MODEL_ID = "mock-chat";
      env.GEO_MODEL_API_KEY = "test-only-key";
    }
    playwright = spawn("node_modules/.bin/playwright", ["test", ...process.argv.slice(2)], {
      stdio: "inherit", env,
    });
    const result = await new Promise((resolve) => {
      playwright.once("exit", (code, signal) => resolve({ code, signal }));
      playwright.once("error", () => resolve({ code: 1, signal: null }));
    });
    process.exitCode = result.code ?? 1;
  }
} finally {
  process.off("SIGINT", forwardSignal);
  process.off("SIGTERM", forwardSignal);
  if (playwright && playwright.exitCode === null) playwright.kill("SIGTERM");
  if (mock) {
    mock.closeAllConnections();
    await new Promise((resolve) => mock.close(resolve));
  }
  rmSync(state, { recursive: true, force: true });
}
