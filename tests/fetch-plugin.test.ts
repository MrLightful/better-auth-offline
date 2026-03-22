import { describe, it, expect, vi, beforeEach } from "vitest";
import { createOfflineFetchPlugin } from "../src/fetch-plugin.js";
import type { StorageAdapter, CacheEntry } from "../src/types.js";

function createMockStorage(): StorageAdapter & {
  store: Map<string, unknown>;
} {
  const store = new Map<string, unknown>();
  return {
    store,
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    set: vi.fn(async (key: string, value: unknown) => {
      store.set(key, value);
    }),
    delete: vi.fn(async (key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(async () => {
      store.clear();
    }),
  };
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("createOfflineFetchPlugin", () => {
  let storage: ReturnType<typeof createMockStorage>;

  beforeEach(() => {
    storage = createMockStorage();
  });

  // T1: Online GET success → caches response
  it("caches successful GET responses", async () => {
    const plugin = createOfflineFetchPlugin(storage, {});
    const mockFetch = vi.fn(() => Promise.resolve(jsonResponse({ user: "alice" })));

    const result = plugin.init!("http://localhost/api/auth/get-session", {
      method: "GET",
      customFetchImpl: mockFetch,
    });

    const { options } = result instanceof Promise ? await result : result;
    const response = await options!.customFetchImpl!("http://localhost/api/auth/get-session", {});
    const data = await response.json();

    expect(data).toEqual({ user: "alice" });
    expect(mockFetch).toHaveBeenCalledOnce();

    // Wait for fire-and-forget cache write
    await vi.waitFor(() => {
      expect(storage.set).toHaveBeenCalled();
    });

    const cached = storage.store.get("/api/auth/get-session") as CacheEntry;
    expect(cached.data).toEqual({ user: "alice" });
    expect(cached.cachedAt).toBeTypeOf("number");
  });

  // T2: Online GET network failure → serves from cache
  it("serves cached response on network failure", async () => {
    const entry: CacheEntry = { data: { user: "alice" }, cachedAt: Date.now() };
    storage.store.set("/api/auth/get-session", entry);

    const plugin = createOfflineFetchPlugin(storage, {});
    const mockFetch = vi.fn(() => Promise.reject(new TypeError("Failed to fetch")));

    const result = plugin.init!("http://localhost/api/auth/get-session", {
      method: "GET",
      customFetchImpl: mockFetch,
    });

    const { options } = result instanceof Promise ? await result : result;
    const response = await options!.customFetchImpl!("http://localhost/api/auth/get-session", {});
    const data = await response.json();

    expect(data).toEqual({ user: "alice" });
    expect(response.headers.get("X-Offline-Cache")).toBe("true");
  });

  // T3: Online GET network failure + no cache → propagates error
  it("propagates error when network fails and no cache exists", async () => {
    const plugin = createOfflineFetchPlugin(storage, {});
    const mockFetch = vi.fn(() => Promise.reject(new TypeError("Failed to fetch")));

    const result = plugin.init!("http://localhost/api/auth/get-session", {
      method: "GET",
      customFetchImpl: mockFetch,
    });

    const { options } = result instanceof Promise ? await result : result;

    await expect(
      options!.customFetchImpl!("http://localhost/api/auth/get-session", {}),
    ).rejects.toThrow("Failed to fetch");
  });

  // T4: Offline GET → serves from cache (same as T2, but semantically distinct)
  it("serves cached data when fetch throws AbortError", async () => {
    const entry: CacheEntry = { data: { session: "active" }, cachedAt: Date.now() };
    storage.store.set("/api/auth/get-session", entry);

    const plugin = createOfflineFetchPlugin(storage, {});
    const mockFetch = vi.fn(() =>
      Promise.reject(new DOMException("The operation was aborted", "AbortError")),
    );

    const result = plugin.init!("http://localhost/api/auth/get-session", {
      method: "GET",
      customFetchImpl: mockFetch,
    });

    const { options } = result instanceof Promise ? await result : result;
    const response = await options!.customFetchImpl!("http://localhost/api/auth/get-session", {});
    const data = await response.json();

    expect(data).toEqual({ session: "active" });
  });

  // T5: Offline GET + cache miss → propagates error
  it("propagates AbortError when no cache exists", async () => {
    const plugin = createOfflineFetchPlugin(storage, {});
    const mockFetch = vi.fn(() =>
      Promise.reject(new DOMException("The operation was aborted", "AbortError")),
    );

    const result = plugin.init!("http://localhost/api/auth/get-session", {
      method: "GET",
      customFetchImpl: mockFetch,
    });

    const { options } = result instanceof Promise ? await result : result;

    await expect(
      options!.customFetchImpl!("http://localhost/api/auth/get-session", {}),
    ).rejects.toThrow();
  });

  // T6: POST request → passthrough, no caching
  it("passes through POST requests without caching", async () => {
    const plugin = createOfflineFetchPlugin(storage, {});
    const mockFetch = vi.fn(() => Promise.resolve(jsonResponse({ ok: true })));

    const result = plugin.init!("http://localhost/api/auth/sign-in/email", {
      method: "POST",
      customFetchImpl: mockFetch,
    });

    const { options } = result instanceof Promise ? await result : result;
    await options!.customFetchImpl!("http://localhost/api/auth/sign-in/email", {});

    expect(mockFetch).toHaveBeenCalledOnce();
    expect(storage.set).not.toHaveBeenCalled();
  });

  // T7: Blocklisted path → skips caching
  it("skips caching for blocklisted paths", async () => {
    const plugin = createOfflineFetchPlugin(storage, {});
    const mockFetch = vi.fn(() =>
      Promise.resolve(jsonResponse({ codes: ["abc", "def"] })),
    );

    const result = plugin.init!("http://localhost/api/auth/two-factor/backup-codes", {
      method: "GET",
      customFetchImpl: mockFetch,
    });

    const { options } = result instanceof Promise ? await result : result;
    await options!.customFetchImpl!("http://localhost/api/auth/two-factor/backup-codes", {});

    expect(mockFetch).toHaveBeenCalledOnce();

    // Wait a tick to ensure no async cache write happened
    await new Promise((r) => setTimeout(r, 10));
    expect(storage.set).not.toHaveBeenCalled();
  });
});
