import "server-only";
import { drizzle } from "drizzle-orm/d1";
import { getPlatformProxy } from "wrangler";
import { conversationRepository } from "./conversations";

export type SnapshotBucket = {
  put(key: string, value: string | Uint8Array, options?: { httpMetadata?: { contentType: string } }): Promise<unknown>;
  get(key: string): Promise<{ text(): Promise<string> } | null>;
  delete(key: string): Promise<void>;
};

type LocalBindings = { DB: Parameters<typeof drizzle>[0]; SNAPSHOTS: SnapshotBucket };

// Keep a single workerd proxy across Next development hot reloads.
const globalDb = globalThis as typeof globalThis & {
  geoBindings?: Promise<{ db: ReturnType<typeof drizzle>; bucket: SnapshotBucket }>;
};

export async function getGeoBindings() {
  // This PR connects local D1 only. Never silently use local disk in a deployment.
  if (process.env.NODE_ENV === "production" && process.env.GEO_LOCAL_DB !== "1") {
    throw new Error("Remote D1 binding is not configured. Local preview requires GEO_LOCAL_DB=1.");
  }
  if (!globalDb.geoBindings) {
    globalDb.geoBindings = getPlatformProxy<LocalBindings>({
      configPath: "wrangler.jsonc",
      remoteBindings: false,
      persist: { path: process.env.GEO_D1_PERSIST || ".wrangler/state/v3" },
    }).then(({ env }) => ({ db: drizzle(env.DB), bucket: env.SNAPSHOTS }))
      .catch((error) => {
        delete globalDb.geoBindings;
        throw error;
      });
  }
  return globalDb.geoBindings;
}

export async function getConversationStore() {
  return conversationRepository((await getGeoBindings()).db);
}
