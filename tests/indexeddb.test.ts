import "fake-indexeddb/auto";
import { testStorageAdapter } from "./storage.test.js";
import { createIndexedDBAdapter } from "../src/adapters/indexeddb.js";

let dbCounter = 0;

// T10–T11: IndexedDB adapter — reuse shared storage adapter tests
testStorageAdapter("IndexedDB", () => {
  // Use unique DB name per test to avoid cross-test contamination
  return createIndexedDBAdapter(`test-db-${dbCounter++}`);
});
