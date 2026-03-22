export interface StorageAdapter {
  clear(): Promise<void>;
  delete(key: string): Promise<void>;
  get(key: string): Promise<unknown | null>;
  set(key: string, value: unknown): Promise<void>;
}

interface BaseOptions {
  /**
   * Custom storage adapter. Defaults to IndexedDB adapter.
   */
  storage?: StorageAdapter;
}

interface DefaultAllowlistOptions extends BaseOptions {
  /**
   * Paths to remove from the default allowlist.
   */
  excludePaths?: string[];
  /**
   * Additional paths to cache (extends the default allowlist).
   */
  includePaths?: string[];
  mode?: "default";
}

interface CustomAllowlistOptions extends BaseOptions {
  /**
   * Only these paths are cached (default allowlist is ignored).
   */
  allowlist: string[];
  mode: "custom";
}

export type OfflinePluginOptions =
  | DefaultAllowlistOptions
  | CustomAllowlistOptions;

/**
 * Shape of a cached response entry.
 */
export interface CacheEntry {
  cachedAt: number;
  data: unknown;
}
