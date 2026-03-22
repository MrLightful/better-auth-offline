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
   * Additional paths to cache (extends the default allowlist).
   */
  additionalPaths?: string[];
  /**
   * Paths to remove from the default allowlist.
   */
  excludePaths?: string[];
  /**
   * Override the default allowlist entirely.
   * When set, only these paths are cached (default allowlist is ignored).
   */
  overrideAllowlist?: string[];
}

/**
 * Shape of a cached response entry.
 */
export interface CacheEntry {
  data: unknown;
  cachedAt: number;
}
