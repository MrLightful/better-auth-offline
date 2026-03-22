import type { BetterAuthClientPlugin } from "better-auth/client";
import { createIndexedDBAdapter } from "./adapters/indexeddb.js";
import { createOfflineFetchPlugin } from "./fetch-plugin.js";
import { createOnlineStatusAtom } from "./online-status.js";
import type { OfflinePluginOptions, StorageAdapter } from "./types.js";

export { createIndexedDBAdapter } from "./adapters/indexeddb.js";
export { createOnlineStatusAtom } from "./online-status.js";
// Re-export types for consumers
export type {
  CacheEntry,
  OfflinePluginOptions,
  StorageAdapter,
} from "./types.js";

const SIGN_OUT_PATHS = ["/sign-out", "/signout", "/logout"];
const SIGN_IN_PATHS = ["/sign-in", "/signin", "/login"];

function isAuthChangePath(path: string): boolean {
  return (
    SIGN_OUT_PATHS.some((p) => path.includes(p)) ||
    SIGN_IN_PATHS.some((p) => path.includes(p))
  );
}

/**
 * better-auth offline plugin.
 *
 * Transparently caches GET API responses and serves them when offline.
 * Drop-in: no consumer code changes required.
 *
 * @example
 * ```ts
 * import { createAuthClient } from "better-auth/client";
 * import { offlinePlugin } from "better-auth-offline";
 *
 * const authClient = createAuthClient({
 *   plugins: [offlinePlugin()],
 * });
 * ```
 */
export function offlinePlugin(
  options: OfflinePluginOptions = {}
): BetterAuthClientPlugin {
  const storage: StorageAdapter = options.storage ?? createIndexedDBAdapter();

  return {
    id: "better-auth-offline",

    getAtoms() {
      return {
        onlineStatus: createOnlineStatusAtom(),
      };
    },

    fetchPlugins: [createOfflineFetchPlugin(storage, options)],

    atomListeners: [
      {
        matcher(path: string) {
          return isAuthChangePath(path);
        },
        signal: "$sessionSignal",
        callback() {
          // Clear cache on sign-out / sign-in to prevent cross-user data leaks
          storage.clear();
        },
      },
    ],

    getActions() {
      return {
        clearCache: () => storage.clear(),
      };
    },
  };
}
