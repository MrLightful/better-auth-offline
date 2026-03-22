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
  // T16: Custom blocklist
  it("extends default blocklist with excludePaths", async () => {
    const storage = createMockStorage();
    const plugin = createOfflineFetchPlugin(storage, {
      excludePaths: ["/custom-sensitive"],
    });

    const mockFetch = vi.fn(() => Promise.resolve(jsonResponse({ data: "secret" })));

    const result = plugin.init!("http://localhost/api/auth/custom-sensitive", {
      method: "GET",
      customFetchImpl: mockFetch,
    });
    const { options } = result instanceof Promise ? await result : result;
    await options!.customFetchImpl!("http://localhost/api/auth/custom-sensitive", {});

    await new Promise((r) => setTimeout(r, 10));
    expect(storage.set).not.toHaveBeenCalled();
  });

  it("overrides default blocklist with overrideBlocklist", async () => {
    const storage = createMockStorage();
    // Override with empty blocklist — nothing is blocked
    const plugin = createOfflineFetchPlugin(storage, {
      overrideBlocklist: [],
    });

    const mockFetch = vi.fn(() =>
      Promise.resolve(jsonResponse({ codes: ["abc"] })),
    );

    // This path is in default blocklist but should now be cached
    const result = plugin.init!("http://localhost/api/auth/two-factor/backup-codes", {
      method: "GET",
      customFetchImpl: mockFetch,
    });
    const { options } = result instanceof Promise ? await result : result;
    await options!.customFetchImpl!("http://localhost/api/auth/two-factor/backup-codes", {});

    await vi.waitFor(() => {
      expect(storage.set).toHaveBeenCalled();
    });
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
