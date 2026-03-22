export interface StorageAdapter {
  get(key: string): Promise<unknown | null>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

export interface OfflinePluginOptions {
  /**
   * Custom storage adapter. Defaults to IndexedDB adapter.
   */
  storage?: StorageAdapter;
  /**
   * Additional paths to exclude from caching (extends the default blocklist).
   */
  excludePaths?: string[];
  /**
   * Override the default blocklist entirely.
   * When set, only these paths are excluded (default blocklist is ignored).
   */
  overrideBlocklist?: string[];
}

/**
 * Shape of a cached response entry.
 */
export interface CacheEntry {
  data: unknown;
  cachedAt: number;
}
