export interface StorageAdapter {
  get(key: string): Promise<unknown | null>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

interface BaseOptions {
  /**
   * Custom storage adapter. Defaults to IndexedDB adapter.
   */
  storage?: StorageAdapter;
}

interface DefaultAllowlistOptions extends BaseOptions {
  mode?: "default";
  /**
   * Additional paths to cache (extends the default allowlist).
   */
  includePaths?: string[];
  /**
   * Paths to remove from the default allowlist.
   */
  excludePaths?: string[];
}

interface CustomAllowlistOptions extends BaseOptions {
  mode: "custom";
  /**
   * Only these paths are cached (default allowlist is ignored).
   */
  allowlist: string[];
}

export type OfflinePluginOptions = DefaultAllowlistOptions | CustomAllowlistOptions;

/**
 * Shape of a cached response entry.
 */
export interface CacheEntry {
  data: unknown;
  cachedAt: number;
}
