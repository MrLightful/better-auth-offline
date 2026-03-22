# better-auth-offline

[![NPM Version](https://img.shields.io/npm/v/better-auth-offline)](https://www.npmjs.com/package/better-auth-offline)
[![NPM Downloads](https://img.shields.io/npm/dm/better-auth-offline)](https://www.npmjs.com/package/better-auth-offline)

Offline-first plugin for [better-auth](https://github.com/better-auth/better-auth). Transparently caches auth API responses so your app keeps working when the network doesn't.

## Why offline-first?

The offline-first community is growing — and for good reason. Users expect apps to work everywhere: on flaky Wi-Fi, in airplane mode, in rural areas with spotty coverage, and on mobile devices that constantly switch between networks. PWAs, local-first architectures, and edge computing are making offline-capable apps the norm, not the exception.

Authentication is often the first thing that breaks when the network drops. A user who was just signed in gets thrown to a login screen — or worse, a blank page. **better-auth-offline** fixes that. It's a drop-in plugin that caches auth responses so your users stay authenticated and your UI stays functional, even offline.

No changes to your existing code. Just add the plugin.

## Features

- **Network-first with cache fallback** — always tries the network first, serves cached data when offline
- **Drop-in integration** — one line to add, zero changes to your existing auth code
- **Automatic cache invalidation** — clears cache on sign-in/sign-out to prevent cross-user data leaks
- **Configurable allowlist** — choose which endpoints to cache, extend or replace the defaults
- **IndexedDB storage** — persistent cache that survives page refreshes, with a pluggable storage adapter interface
- **Online status tracking** — reactive `useOnlineStatus()` hook for your UI
- **SSR safe** — works in server-side rendering environments without errors

## Quick Start

Install the plugin:

```bash
npm install better-auth-offline
```

Add it to your auth client:

```ts
import { createAuthClient } from "better-auth/react";
import { offlinePlugin } from "better-auth-offline";

const authClient = createAuthClient({
  plugins: [offlinePlugin()],
});
```

That's it. Your auth API responses are now cached and served when offline.

## How It Works

1. Your app makes a GET request to an allowlisted auth endpoint (e.g. `/api/auth/get-session`)
2. The plugin lets the request go to the network as normal
3. On success, the JSON response is cached in IndexedDB (fire-and-forget — doesn't slow down the response)
4. If the network request fails (no connectivity), the plugin serves the cached response instead
5. Cached responses include an `X-Offline-Cache: true` header so you can detect them if needed

Only GET requests to allowlisted paths are cached. Mutations (sign-in, sign-out, etc.) always go to the network.

## Configuration

### Default mode — extend or exclude paths

By default, the plugin caches a curated set of common auth endpoints. You can extend or trim this list:

```ts
offlinePlugin({
  // Add your custom endpoints to the default list
  includePaths: ["/my-custom-endpoint", "/user/preferences"],

  // Remove endpoints you don't need cached
  excludePaths: ["/admin/list-users"],
})
```

### Custom mode — full control

Replace the default allowlist entirely:

```ts
offlinePlugin({
  mode: "custom",
  allowlist: [
    "/get-session",
    "/list-accounts",
    "/my-app/specific-endpoint",
  ],
})
```

### Custom storage adapter

Swap out IndexedDB for any storage backend:

```ts
import { offlinePlugin } from "better-auth-offline";

offlinePlugin({
  storage: myCustomAdapter,
})
```

See [Custom Storage Adapters](#custom-storage-adapters) for the interface.

## Default Allowlist

These endpoints are cached by default (in `mode: "default"`):

| Category | Endpoints |
|----------|-----------|
| **Core** | `/get-session`, `/list-sessions`, `/list-accounts`, `/account-info` |
| **Organization** | `/organization/list`, `/organization/get-active-member`, `/organization/get-active-member-role`, `/organization/get-full-organization`, `/organization/list-members`, `/organization/list-teams`, `/organization/list-invitations` |
| **Admin** | `/admin/list-users` |
| **Multi-session** | `/multi-session/list-device-sessions` |
| **Passkey** | `/passkey/list-user-passkeys` |
| **API Key** | `/api-key/get`, `/api-key/list` |

Path matching uses suffix matching, so these work regardless of your `baseURL` or path prefix configuration.

## Online Status

The plugin exposes a reactive online/offline status hook:

```tsx
function MyComponent() {
  const onlineStatus = authClient.useOnlineStatus();

  return (
    <div>
      {onlineStatus ? "Online" : "Offline"}
    </div>
  );
}
```

This tracks the browser's `navigator.onLine` property and listens for `online`/`offline` events. In SSR environments, it defaults to `true`.

## Cache Management

### Automatic invalidation

The cache is automatically cleared when a user signs in or signs out. This prevents stale data from one user being served to another.

### Manual cache clearing

```ts
await authClient.clearCache();
```

### Detecting cached responses

Responses served from cache include the header `X-Offline-Cache: true`.

## Custom Storage Adapters

The plugin uses IndexedDB by default, but you can provide any storage backend that implements the `StorageAdapter` interface:

```ts
import type { StorageAdapter } from "better-auth-offline";

const myAdapter: StorageAdapter = {
  async get(key: string): Promise<unknown | null> {
    // Return cached value or null
  },
  async set(key: string, value: unknown): Promise<void> {
    // Store the value
  },
  async delete(key: string): Promise<void> {
    // Remove a single entry
  },
  async clear(): Promise<void> {
    // Remove all entries
  },
};

offlinePlugin({ storage: myAdapter });
```

The built-in IndexedDB adapter can also be customized with a different database name:

```ts
import { createIndexedDBAdapter } from "better-auth-offline";

offlinePlugin({
  storage: createIndexedDBAdapter("my-custom-db-name"),
});
```

## API Reference

### Exports from `better-auth-offline`

| Export | Type | Description |
|--------|------|-------------|
| `offlinePlugin` | `(options?: OfflinePluginOptions) => BetterAuthClientPlugin` | Main plugin factory |
| `createIndexedDBAdapter` | `(dbName?: string) => StorageAdapter` | Creates an IndexedDB storage adapter |
| `createOnlineStatusAtom` | `() => Atom<boolean>` | Creates a nanostores atom tracking online status |
| `StorageAdapter` | Type | Interface for custom storage backends |
| `OfflinePluginOptions` | Type | Plugin configuration options |
| `CacheEntry` | Type | Shape of cached entries (`{ data: unknown, cachedAt: number }`) |

### Exports from `better-auth-offline/adapters`

| Export | Type | Description |
|--------|------|-------------|
| `createIndexedDBAdapter` | `(dbName?: string) => StorageAdapter` | IndexedDB storage adapter (alternative import path) |

## Example App

The `example/` directory contains a full Next.js app demonstrating the plugin in action:

- Sign in with demo credentials (`demo@example.com` / `demo`)
- See session data cached and served offline
- Toggle offline mode in DevTools to test
- Inspect the IndexedDB cache directly

Run it:

```bash
cd example
bun install
bun dev
```

## Roadmap

- **Prewarming / Eager Data Loading** — Mechanism to eagerly fetch and cache endpoints on app initialization, so the cache is warm before going offline. Critical for apps that go offline unpredictably (mobile, field workers).

## Contributing

Contributions are welcome! This project uses:

- **bun** as the package manager
- **vitest** for testing
- **tsup** for building
- **turbo** for monorepo orchestration

```bash
# Install dependencies
bun install

# Run tests
cd better-auth-offline && bun test

# Build
cd better-auth-offline && bun run build
```

## License

MIT
