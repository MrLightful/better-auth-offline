import "fake-indexeddb/auto";
import { createIndexedDBAdapter } from "../src/adapters/indexeddb.js";
import { testStorageAdapter } from "./storage.test.js";

let dbCounter = 0;

// T10–T11: IndexedDB adapter — reuse shared storage adapter tests
testStorageAdapter("IndexedDB", () => {
  // Use unique DB name per test to avoid cross-test contamination
  return createIndexedDBAdapter(`test-db-${dbCounter++}`);
});
