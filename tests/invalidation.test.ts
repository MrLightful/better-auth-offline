import { describe, it, expect, vi } from "vitest";
import { offlinePlugin } from "../src/index.js";
import type { StorageAdapter } from "../src/types.js";

function createMockStorage(): StorageAdapter {
  const store = new Map<string, unknown>();
  return {
    get: vi.fn(async (key) => store.get(key) ?? null),
    set: vi.fn(async (key, value) => { store.set(key, value); }),
    delete: vi.fn(async (key) => { store.delete(key); }),
    clear: vi.fn(async () => { store.clear(); }),
  };
}

describe("Cache invalidation", () => {
  // T14: sign-out clears cache
  it("atomListeners matcher matches sign-out paths", () => {
    const storage = createMockStorage();
    const plugin = offlinePlugin({ storage });

    const listeners = plugin.atomListeners!;
    expect(listeners.length).toBeGreaterThan(0);

    const listener = listeners[0];
    expect(listener.matcher("/sign-out")).toBe(true);
    expect(listener.matcher("/signout")).toBe(true);
    expect(listener.matcher("/logout")).toBe(true);
  });

  it("atomListeners callback clears storage on sign-out", async () => {
    const storage = createMockStorage();
    const plugin = offlinePlugin({ storage });

    const listener = plugin.atomListeners![0];
    listener.callback!("/sign-out");

    expect(storage.clear).toHaveBeenCalled();
  });

  // T15: sign-in clears stale cache
  it("atomListeners matcher matches sign-in paths", () => {
    const storage = createMockStorage();
    const plugin = offlinePlugin({ storage });

    const listener = plugin.atomListeners![0];
    expect(listener.matcher("/sign-in/email")).toBe(true);
    expect(listener.matcher("/signin")).toBe(true);
    expect(listener.matcher("/login")).toBe(true);
  });

  it("does not match unrelated paths", () => {
    const storage = createMockStorage();
    const plugin = offlinePlugin({ storage });

    const listener = plugin.atomListeners![0];
    expect(listener.matcher("/get-session")).toBe(false);
    expect(listener.matcher("/user/profile")).toBe(false);
  });
});
