import type { OfflinePluginOptions } from "./types.js";

/**
 * Default paths that are cached for offline access.
 * Only GET requests to these paths will be cached.
 */
const DEFAULT_ALLOWLIST = [
  // Core
  "/get-session",
  "/list-sessions",
  "/list-accounts",
  "/account-info",
  // Organization
  "/organization/list",
  "/organization/get-active-member",
  "/organization/get-active-member-role",
  "/organization/get-full-organization",
  "/organization/list-members",
  "/organization/list-teams",
  "/organization/list-invitations",
  // Admin
  "/admin/list-users",
  // Multi-session
  "/multi-session/list-device-sessions",
  // Passkey
  "/passkey/list-user-passkeys",
  // API Key
  "/api-key/get",
  "/api-key/list",
];

/**
 * Get the effective allowlist based on plugin options.
 */
export function getAllowlist(options: OfflinePluginOptions): string[] {
  if (options.overrideAllowlist) {
    return options.overrideAllowlist;
  }
  const exclude = new Set(options.excludePaths ?? []);
  const base = exclude.size > 0
    ? DEFAULT_ALLOWLIST.filter((p) => !exclude.has(p))
    : DEFAULT_ALLOWLIST;
  return [...base, ...(options.additionalPaths ?? [])];
}

/**
 * Check if a path should be cached.
 * Uses suffix matching to handle configurable base path prefixes.
 */
export function isAllowlisted(
  path: string,
  allowlist: string[],
): boolean {
  return allowlist.some(
    (allowed) =>
      path === allowed ||
      path.endsWith(allowed) ||
      path.includes(allowed + "/"),
  );
}
