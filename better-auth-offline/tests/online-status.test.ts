import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("createOnlineStatusAtom", () => {
  let originalWindow: typeof globalThis.window;
  let originalNavigator: PropertyDescriptor | undefined;
  let listeners: Record<string, Array<() => void>>;

  beforeEach(() => {
    listeners = { online: [], offline: [] };
    originalWindow = globalThis.window;
    originalNavigator = Object.getOwnPropertyDescriptor(
      globalThis,
      "navigator"
    );

    // Create minimal window mock with addEventListener
    // @ts-expect-error — partial mock
    globalThis.window = {
      addEventListener(event: string, handler: () => void) {
        if (listeners[event]) {
          listeners[event].push(handler);
        }
      },
    };
  });

  afterEach(() => {
    globalThis.window = originalWindow;
    if (originalNavigator) {
      Object.defineProperty(globalThis, "navigator", originalNavigator);
    } else {
      // @ts-expect-error — restoring
      delete globalThis.navigator;
    }
    // vi.resetModules() not available in bun — not needed since
    // createOnlineStatusAtom is a factory that creates fresh atoms.
  });

  // T12: online → offline transition
  it("updates atom when going offline", async () => {
    Object.defineProperty(globalThis, "navigator", {
      value: { onLine: true },
      writable: true,
      configurable: true,
    });

    // Dynamic import to get fresh module with our mocks active
    const { createOnlineStatusAtom } = await import("../src/online-status.js");
    const atom = createOnlineStatusAtom();
    expect(atom.get()).toBe(true);

    // Simulate going offline
    for (const handler of listeners.offline) {
      handler();
    }
    expect(atom.get()).toBe(false);
  });

  // T13: offline → online transition
  it("updates atom when going online", async () => {
    Object.defineProperty(globalThis, "navigator", {
      value: { onLine: false },
      writable: true,
      configurable: true,
    });

    const { createOnlineStatusAtom } = await import("../src/online-status.js");
    const atom = createOnlineStatusAtom();
    expect(atom.get()).toBe(false);

    // Simulate going online
    for (const handler of listeners.online) {
      handler();
    }
    expect(atom.get()).toBe(true);
  });

  it("defaults to true in non-browser environments", async () => {
    // Remove both window and navigator
    // @ts-expect-error — simulate non-browser
    delete globalThis.window;
    // @ts-expect-error — simulate non-browser
    delete globalThis.navigator;

    const { createOnlineStatusAtom } = await import("../src/online-status.js");
    const atom = createOnlineStatusAtom();
    expect(atom.get()).toBe(true);
  });
});
