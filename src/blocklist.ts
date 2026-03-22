import type { OfflinePluginOptions } from "./types.js";

/**
 * Default paths excluded from caching due to sensitivity.
 */
const DEFAULT_BLOCKLIST = [
  "/two-factor/backup-codes",
  "/two-factor/generate",
  "/two-factor/verify",
  "/recovery-codes",
  "/reset-password",
  "/verify-email",
  "/change-password",
  "/delete-user",
  "/revoke-session",
  "/revoke-sessions",
];

/**
 * Get the effective blocklist based on plugin options.
 */
export function getBlocklist(options: OfflinePluginOptions): string[] {
  if (options.overrideBlocklist) {
    return options.overrideBlocklist;
  }
  return [...DEFAULT_BLOCKLIST, ...(options.excludePaths ?? [])];
}

/**
 * Check if a path should be excluded from caching.
 * Uses prefix matching: if the path starts with any blocklisted path, it's excluded.
 */
export function isBlocklisted(
  path: string,
  blocklist: string[],
): boolean {
  return blocklist.some(
    (blocked) =>
      path === blocked ||
      path.endsWith(blocked) ||
      path.includes(blocked + "/"),
  );
}
