import type { BetterFetchPlugin } from "@better-fetch/fetch";
import { getAllowlist, isAllowlisted } from "./allowlist.js";
import type {
  CacheEntry,
  OfflinePluginOptions,
  StorageAdapter,
} from "./types.js";

/**
 * Extracts the pathname from a URL string, stripping query params.
 * Used as the cache key.
 */
export function extractPath(urlOrPath: string | URL): string {
  try {
    const url =
      typeof urlOrPath === "string" && urlOrPath.startsWith("http")
        ? new URL(urlOrPath)
        : null;
    if (url) {
      return url.pathname;
    }
  } catch {
    // Not a valid URL, treat as path
  }
  // Strip query string from path
  const str = typeof urlOrPath === "string" ? urlOrPath : urlOrPath.pathname;
  const qIndex = str.indexOf("?");
  return qIndex >= 0 ? str.slice(0, qIndex) : str;
}

/**
 * Checks if a network error is a connectivity failure (not an HTTP error).
 */
function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) {
    return true;
  }
  if (error instanceof DOMException && error.name === "AbortError") {
    return true;
  }
  return false;
}

/**
 * Creates the BetterFetchPlugin that provides offline caching.
 *
 * Strategy: Network-First with Cache Fallback
 * - Uses `init` to inject a custom fetch that wraps the real fetch
 * - On successful GET: caches the response body (fire-and-forget)
 * - On network error for GET: serves cached response if available
 * - Only allowlisted GET paths are cached; everything else passes through
 */
export function createOfflineFetchPlugin(
  storage: StorageAdapter,
  options: OfflinePluginOptions
): BetterFetchPlugin {
  const allowlist = getAllowlist(options);

  return {
    id: "better-auth-offline",
    name: "better-auth-offline",

    init(url, fetchOptions) {
      const originalFetch = fetchOptions?.customFetchImpl ?? globalThis.fetch;
      const method = (fetchOptions?.method ?? "GET").toUpperCase();
      const path = extractPath(url);
      const shouldCache = method === "GET" && isAllowlisted(path, allowlist);

      const wrappedFetch: typeof globalThis.fetch = async (input, init) => {
        if (!shouldCache) {
          return originalFetch(input, init);
        }

        try {
          const response = await originalFetch(input, init);

          // Cache successful GET responses (fire-and-forget)
          if (response.ok) {
            // Clone before reading body so the original response remains usable
            const clone = response.clone();
            clone
              .json()
              .then((data) => {
                const entry: CacheEntry = { data, cachedAt: Date.now() };
                storage.set(path, entry);
              })
              .catch(() => {
                // Response wasn't JSON or read failed — skip caching
              });
          }

          return response;
        } catch (error) {
          // Network error — try serving from cache
          if (isNetworkError(error)) {
            const cached = (await storage.get(path)) as CacheEntry | null;
            if (cached) {
              return new Response(JSON.stringify(cached.data), {
                status: 200,
                headers: {
                  "Content-Type": "application/json",
                  "X-Offline-Cache": "true",
                },
              });
            }
          }
          // No cache hit or not a network error — rethrow
          throw error;
        }
      };

      // Mutate the original options object directly rather than spreading
      // into a new one. @better-fetch/fetch's initializePlugins passes the
      // same `options` reference to every plugin's init(). If we return a
      // new object, a later plugin (e.g. applySchemaPlugin) that returns
      // the original reference will overwrite our customFetchImpl, silently
      // disabling the offline cache. By mutating in place, the wrapping
      // survives regardless of plugin ordering.
      if (fetchOptions) {
        fetchOptions.customFetchImpl = wrappedFetch;
      }

      return {
        url,
        options: fetchOptions ?? { customFetchImpl: wrappedFetch },
      };
    },
  };
}
