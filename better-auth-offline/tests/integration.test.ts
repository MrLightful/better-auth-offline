import { beforeEach, describe, expect, it, vi } from "vitest";
import { offlinePlugin } from "../src/index.js";
import type { CacheEntry, StorageAdapter } from "../src/types.js";

/**
 * Integration tests that verify the full plugin behavior end-to-end.
 * These use the plugin factory (not internal modules) and simulate
 * the lifecycle that better-auth's client would trigger.
 */

function createMockStorage(): StorageAdapter & { store: Map<string, unknown> } {
  const store = new Map<string, unknown>();
  return {
    store,
    get: vi.fn(async (key) => store.get(key) ?? null),
    set: vi.fn(async (key, value) => {
      store.set(key, value);
    }),
    delete: vi.fn(async (key) => {
      store.delete(key);
    }),
    clear: vi.fn(async () => {
      store.clear();
    }),
  };
}

function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Simulates what better-auth does: calls plugin.init() to get the
 * wrapped fetch, then uses it to make requests.
 */
async function simulateFetch(
  plugin: ReturnType<typeof offlinePlugin>,
  url: string,
  mockFetch: typeof globalThis.fetch,
  method = "GET"
) {
  const fetchPlugin = plugin.fetchPlugins![0];
  const result = fetchPlugin.init!(url, {
    method,
    customFetchImpl: mockFetch,
  });
  const { options } = result instanceof Promise ? await result : result;
  return options!.customFetchImpl!(url, {});
}

describe("Integration: full offline flow", () => {
  let storage: ReturnType<typeof createMockStorage>;
  let plugin: ReturnType<typeof offlinePlugin>;

  beforeEach(() => {
    storage = createMockStorage();
    plugin = offlinePlugin({ storage });
  });

  // T18: Online GET → cache → offline → serve from cache
  it("caches online response and serves it when offline", async () => {
    const sessionData = {
      session: { id: "sess_1", userId: "user_1" },
      user: { id: "user_1", name: "Alice" },
    };

    // Phase 1: Online — make a GET that succeeds
    const onlineFetch = vi.fn(() => Promise.resolve(jsonResponse(sessionData)));
    const onlineResponse = await simulateFetch(
      plugin,
      "http://localhost/api/auth/get-session",
      onlineFetch
    );
    const onlineData = await onlineResponse.json();
    expect(onlineData).toEqual(sessionData);

    // Wait for fire-and-forget cache write
    await new Promise((r) => setTimeout(r, 50));
    expect(storage.set).toHaveBeenCalled();

    // Phase 2: Offline — same GET now fails, should serve from cache
    const offlineFetch = vi.fn(() =>
      Promise.reject(new TypeError("Failed to fetch"))
    );
    const offlineResponse = await simulateFetch(
      plugin,
      "http://localhost/api/auth/get-session",
      offlineFetch
    );
    const offlineData = await offlineResponse.json();

    expect(offlineData).toEqual(sessionData);
    expect(offlineResponse.headers.get("X-Offline-Cache")).toBe("true");
  });

  // T19: Sign-out → cache cleared → sign-in → no stale data
  it("clears cache on sign-out and has no stale data on sign-in", async () => {
    // Pre-populate cache
    const entry: CacheEntry = {
      data: { user: { id: "user_1", name: "Alice" } },
      cachedAt: Date.now(),
    };
    storage.store.set("/api/auth/get-session", entry);

    // Simulate sign-out: trigger the atomListener callback
    const listener = plugin.atomListeners![0];
    expect(listener.matcher("/sign-out")).toBe(true);
    listener.callback!("/sign-out");

    expect(storage.clear).toHaveBeenCalled();

    // After clear, cache should be empty
    const cached = await storage.get("/api/auth/get-session");
    expect(cached).toBeNull();
  });

  // T20: Plugin exposes atoms and actions
  it("exposes onlineStatus atom and clearCache action", () => {
    const atoms = plugin.getAtoms!(() => Promise.resolve({} as any));
    expect(atoms.onlineStatus).toBeDefined();
    expect(atoms.onlineStatus.get()).toBeTypeOf("boolean");

    // @ts-expect-error — getActions signature varies
    const actions = plugin.getActions!(() => {}, {}, undefined);
    expect(actions.clearCache).toBeTypeOf("function");
  });
});

describe("Integration: createFetch pipeline (applySchemaPlugin interaction)", () => {
  it("offline fallback works through the full createFetch pipeline", async () => {
    const { createFetch } = await import("@better-fetch/fetch");

    const storage = createMockStorage();
    const plugin = offlinePlugin({ storage });
    const fetchPlugin = plugin.fetchPlugins![0];

    const sessionData = {
      session: { id: "sess_1", userId: "user_1" },
      user: { id: "user_1", name: "Alice", email: "alice@test.com" },
    };

    // Phase 1: Online — fetch through createFetch pipeline
    const onlineMock = vi.fn((_input: any, _init: any) =>
      Promise.resolve(jsonResponse(sessionData))
    );

    const $fetchOnline = createFetch({
      baseURL: "http://localhost:3000/api/auth",
      method: "GET",
      customFetchImpl: onlineMock as any,
      plugins: [fetchPlugin],
    });

    const onlineResult = await $fetchOnline("/get-session", { method: "GET" });
    expect(onlineResult.data).toEqual(sessionData);
    expect(onlineMock).toHaveBeenCalledOnce();

    // Wait for fire-and-forget cache write
    await new Promise((r) => setTimeout(r, 50));
    expect(storage.set).toHaveBeenCalled();

    // Phase 2: Offline — same pipeline, but fetch throws
    const offlineMock = vi.fn(() =>
      Promise.reject(new TypeError("Failed to fetch"))
    );

    const $fetchOffline = createFetch({
      baseURL: "http://localhost:3000/api/auth",
      method: "GET",
      customFetchImpl: offlineMock as any,
      plugins: [fetchPlugin],
    });

    const offlineResult = await $fetchOffline("/get-session", {
      method: "GET",
    });
    expect(offlineResult.data).toEqual(sessionData);
    expect(offlineResult.error).toBeNull();
  });

  it("offline fallback works with a SINGLE createFetch instance (realistic scenario)", async () => {
    const { createFetch } = await import("@better-fetch/fetch");

    const storage = createMockStorage();
    const plugin = offlinePlugin({ storage });
    const fetchPlugin = plugin.fetchPlugins![0];

    const sessionData = {
      session: { id: "sess_1", userId: "user_1" },
      user: { id: "user_1", name: "Alice", email: "alice@test.com" },
    };

    // Single mock that switches behavior: online first, then offline
    let isOffline = false;
    const mockFetch = vi.fn((_input: any, _init: any) => {
      if (isOffline) {
        return Promise.reject(new TypeError("Failed to fetch"));
      }
      return Promise.resolve(jsonResponse(sessionData));
    });

    // Single createFetch instance (like the real app)
    const $fetch = createFetch({
      baseURL: "http://localhost:3000/api/auth",
      method: "GET",
      customFetchImpl: mockFetch as any,
      plugins: [fetchPlugin],
    });

    // Phase 1: Online call — should cache
    const onlineResult = await $fetch("/get-session", { method: "GET" });
    expect(onlineResult.data).toEqual(sessionData);

    // Wait for fire-and-forget cache write
    await new Promise((r) => setTimeout(r, 50));
    expect(storage.set).toHaveBeenCalled();

    // Phase 2: Go offline, same $fetch instance
    isOffline = true;
    const offlineResult = await $fetch("/get-session", { method: "GET" });
    expect(offlineResult.data).toEqual(sessionData);
    expect(offlineResult.error).toBeNull();
  });
});
