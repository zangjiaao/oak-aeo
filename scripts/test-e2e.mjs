import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const state = mkdtempSync(join(tmpdir(), "oak-e2e-"));
try {
  const migration = spawnSync("node_modules/.bin/wrangler", ["d1", "migrations", "apply", "DB", "--local", "--persist-to", state], { stdio: "inherit" });
  if (migration.status !== 0) process.exitCode = migration.status ?? 1;
  else {
    const result = spawnSync("node_modules/.bin/playwright", ["test", ...process.argv.slice(2)], {
      stdio: "inherit", env: { ...process.env, GEO_D1_PERSIST: join(state, "v3") },
    });
    process.exitCode = result.status ?? 1;
  }
} finally {
  rmSync(state, { recursive: true, force: true });
}
