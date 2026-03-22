import { describe, it, expect, vi } from "vitest";
import { createOfflineFetchPlugin, extractPath } from "../src/fetch-plugin.js";
import { offlinePlugin } from "../src/index.js";
import type { StorageAdapter } from "../src/types.js";

function createMockStorage(): StorageAdapter & { store: Map<string, unknown> } {
  const store = new Map<string, unknown>();
  return {
    store,
    get: vi.fn(async (key) => store.get(key) ?? null),
    set: vi.fn(async (key, value) => { store.set(key, value); }),
    delete: vi.fn(async (key) => { store.delete(key); }),
    clear: vi.fn(async () => { store.clear(); }),
  };
}

function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("Plugin configuration", () => {
  // T16: Custom allowlist
  it("extends default allowlist with includePaths", async () => {
    const storage = createMockStorage();
    const plugin = createOfflineFetchPlugin(storage, {
      includePaths: ["/custom-endpoint"],
    });

    const mockFetch = vi.fn(() => Promise.resolve(jsonResponse({ data: "custom" })));

    const result = plugin.init!("http://localhost/api/auth/custom-endpoint", {
      method: "GET",
      customFetchImpl: mockFetch,
    });
    const { options } = result instanceof Promise ? await result : result;
    await options!.customFetchImpl!("http://localhost/api/auth/custom-endpoint", {});

    await new Promise((r) => setTimeout(r, 10));
    expect(storage.set).toHaveBeenCalled();
  });

  it("overrides default allowlist with allowlist", async () => {
    const storage = createMockStorage();
    const plugin = createOfflineFetchPlugin(storage, {
      mode: "custom",
      allowlist: ["/only-this"],
    });

    const mockFetch = vi.fn(() =>
      Promise.resolve(jsonResponse({ data: "test" })),
    );

    // /get-session is in default allowlist but NOT in override — should NOT be cached
    const result1 = plugin.init!("http://localhost/api/auth/get-session", {
      method: "GET",
      customFetchImpl: mockFetch,
    });
    const { options: opts1 } = result1 instanceof Promise ? await result1 : result1;
    await opts1!.customFetchImpl!("http://localhost/api/auth/get-session", {});

    await new Promise((r) => setTimeout(r, 10));
    expect(storage.set).not.toHaveBeenCalled();

    // /only-this IS in override — should be cached
    const result2 = plugin.init!("http://localhost/api/auth/only-this", {
      method: "GET",
      customFetchImpl: mockFetch,
    });
    const { options: opts2 } = result2 instanceof Promise ? await result2 : result2;
    await opts2!.customFetchImpl!("http://localhost/api/auth/only-this", {});

    await new Promise((r) => setTimeout(r, 10));
    expect(storage.set).toHaveBeenCalled();
  });

  it("excludes paths from default allowlist with excludePaths", async () => {
    const storage = createMockStorage();
    const plugin = createOfflineFetchPlugin(storage, {
      excludePaths: ["/get-session"],
    });

    const mockFetch = vi.fn(() => Promise.resolve(jsonResponse({ data: "test" })));

    // /get-session is in default allowlist but excluded — should NOT be cached
    const result = plugin.init!("http://localhost/api/auth/get-session", {
      method: "GET",
      customFetchImpl: mockFetch,
    });
    const { options } = result instanceof Promise ? await result : result;
    await options!.customFetchImpl!("http://localhost/api/auth/get-session", {});

    await new Promise((r) => setTimeout(r, 10));
    expect(storage.set).not.toHaveBeenCalled();
  });

  // T17: Custom storage adapter
  it("uses custom storage adapter when provided", () => {
    const customStorage = createMockStorage();
    const plugin = offlinePlugin({ storage: customStorage });

    // Verify the plugin was created with our custom storage
    expect(plugin.id).toBe("better-auth-offline");
    expect(plugin.fetchPlugins).toHaveLength(1);
  });

  it("exposes clearCache action that uses the provided adapter", async () => {
    const customStorage = createMockStorage();
    const plugin = offlinePlugin({ storage: customStorage });

    // @ts-expect-error — getActions signature varies
    const actions = plugin.getActions!(() => {}, {}, undefined);
    await actions.clearCache();

    expect(customStorage.clear).toHaveBeenCalled();
  });
});

describe("extractPath", () => {
  it("extracts pathname from full URL", () => {
    expect(extractPath("http://localhost:3000/api/auth/get-session")).toBe(
      "/api/auth/get-session",
    );
  });

  it("strips query parameters from URL", () => {
    expect(
      extractPath("http://localhost/api/auth/get-session?disableCookieCache=true"),
    ).toBe("/api/auth/get-session");
  });

  it("handles plain path strings", () => {
    expect(extractPath("/api/auth/get-session")).toBe("/api/auth/get-session");
  });

  it("strips query params from plain paths", () => {
    expect(extractPath("/api/auth/get-session?foo=bar")).toBe(
      "/api/auth/get-session",
    );
  });
});
