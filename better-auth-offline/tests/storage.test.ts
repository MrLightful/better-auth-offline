import { describe, it, expect } from "vitest";
import type { StorageAdapter } from "../src/types.js";

/**
 * Shared test suite that validates any StorageAdapter implementation.
 * Used by both the mock adapter tests and the IndexedDB adapter tests.
 */
export function testStorageAdapter(
  name: string,
  createAdapter: () => StorageAdapter,
) {
  describe(`StorageAdapter: ${name}`, () => {
    // T8: get/set/delete operations
    it("stores and retrieves values", async () => {
      const adapter = createAdapter();
      await adapter.set("key1", { data: "hello", cachedAt: 1000 });
      const result = await adapter.get("key1");
      expect(result).toEqual({ data: "hello", cachedAt: 1000 });
    });

    it("returns null for missing keys", async () => {
      const adapter = createAdapter();
      const result = await adapter.get("nonexistent");
      expect(result).toBeNull();
    });

    it("overwrites existing values", async () => {
      const adapter = createAdapter();
      await adapter.set("key1", { data: "first", cachedAt: 1000 });
      await adapter.set("key1", { data: "second", cachedAt: 2000 });
      const result = await adapter.get("key1");
      expect(result).toEqual({ data: "second", cachedAt: 2000 });
    });

    it("deletes a specific key", async () => {
      const adapter = createAdapter();
      await adapter.set("key1", { data: "hello", cachedAt: 1000 });
      await adapter.delete("key1");
      const result = await adapter.get("key1");
      expect(result).toBeNull();
    });

    it("handles deleting non-existent keys without error", async () => {
      const adapter = createAdapter();
      await expect(adapter.delete("nonexistent")).resolves.toBeUndefined();
    });

    // T9: clear() operation
    it("clears all entries", async () => {
      const adapter = createAdapter();
      await adapter.set("key1", { data: "a", cachedAt: 1000 });
      await adapter.set("key2", { data: "b", cachedAt: 2000 });
      await adapter.clear();
      expect(await adapter.get("key1")).toBeNull();
      expect(await adapter.get("key2")).toBeNull();
    });

    it("handles clearing an already-empty store", async () => {
      const adapter = createAdapter();
      await expect(adapter.clear()).resolves.toBeUndefined();
    });
  });
}

// Run with a simple in-memory adapter to validate the test suite itself
function createMemoryAdapter(): StorageAdapter {
  const store = new Map<string, unknown>();
  return {
    get: async (key) => store.get(key) ?? null,
    set: async (key, value) => { store.set(key, value); },
    delete: async (key) => { store.delete(key); },
    clear: async () => { store.clear(); },
  };
}

testStorageAdapter("In-Memory", createMemoryAdapter);
