# TODOS

## Prewarming / Eager Data Loading
**Priority:** High | **Effort:** human: ~1 week / CC: ~30min | **Depends on:** v1 lazy caching stable

Add a prewarming mechanism that eagerly fetches and caches all (or configured) GET endpoints on app initialization, so the cache is warm before the app goes offline.

**Why:** Lazy caching only covers endpoints the user has visited. If the app goes offline before visiting a page, that data isn't cached. Prewarming ensures full offline coverage. Critical for apps that expect to go offline unpredictably (e.g., mobile, field workers).

**Approach:** The StorageAdapter interface and fetchPlugin interception from v1 are the foundation. Prewarming adds a new `init` phase that calls configured endpoints on plugin load. Could use `getActions` to expose `offline.prewarm()` or auto-trigger on client creation. Needs config for which endpoints to prewarm (auto-discovery from server plugin schema, or explicit list).

**Trade-offs:** Adds network overhead on app init. May fetch data the user never needs. Needs to know which endpoints to prewarm.
