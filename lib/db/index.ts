import "server-only";
import { drizzle } from "drizzle-orm/d1";
import { getPlatformProxy } from "wrangler";
import { conversationRepository } from "./conversations";

// Keep a single workerd proxy across Next development hot reloads.
const globalDb = globalThis as typeof globalThis & {
  conversationStore?: Promise<ReturnType<typeof conversationRepository>>;
};

export async function getConversationStore() {
  // This PR connects local D1 only. Never silently use local disk in a deployment.
  if (process.env.NODE_ENV === "production" && process.env.GEO_LOCAL_DB !== "1") {
    throw new Error("Remote D1 binding is not configured. Local preview requires GEO_LOCAL_DB=1.");
  }
  if (!globalDb.conversationStore) {
    globalDb.conversationStore = getPlatformProxy<{ DB: Parameters<typeof drizzle>[0] }>({
      configPath: "wrangler.jsonc",
      remoteBindings: false,
      persist: { path: process.env.GEO_D1_PERSIST || ".wrangler/state/v3" },
    }).then(({ env }) => conversationRepository(drizzle(env.DB)))
      .catch((error) => {
        delete globalDb.conversationStore;
        throw error;
      });
  }
  return globalDb.conversationStore;
}
