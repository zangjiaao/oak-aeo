import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = [resolve(root, "node_modules/wrangler/bin/wrangler.js"), "d1", "migrations", "apply", "DB", "--local"];
if (process.env.GEO_D1_PERSIST) {
  args.push("--persist-to", dirname(resolve(root, process.env.GEO_D1_PERSIST)));
}
const result = spawnSync(process.execPath, args, {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, CI: process.env.CI || "true" },
});
if (result.error) console.error("无法运行本地 D1 迁移：", result.error);
process.exitCode = result.status ?? 1;
