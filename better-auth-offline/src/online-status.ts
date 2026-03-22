import { atom } from "nanostores";

/**
 * Creates a reactive atom that tracks the browser's online/offline status.
 * Defaults to `true` in non-browser environments (SSR).
 */
export function createOnlineStatusAtom() {
  const isOnline = atom<boolean>(
    typeof navigator !== "undefined" && typeof navigator.onLine === "boolean"
      ? navigator.onLine
      : true,
  );

  if (typeof window !== "undefined") {
    window.addEventListener("online", () => isOnline.set(true));
    window.addEventListener("offline", () => isOnline.set(false));
  }

  return isOnline;
}
