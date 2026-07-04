"use client";

/**
 * src/lib/push-client.ts
 *
 * Client-side push notification helper. Uses the browser's built-in
 * `Notification` API (no service worker required for our use case — these
 * are user-triggered "you have a new transaction" pings while the app is
 * open).
 *
 * The flow:
 *   1. The notifications panel calls `requestNotificationPermission()` once
 *      (typically from a button click — browsers block permission prompts
 *      that aren't tied to a user gesture).
 *   2. When polling detects a new notification, `showBrowserNotification`
 *      fires a desktop notification IF permission is granted.
 *
 * Browsers without the Notification API (e.g. some in-app webviews) return
 * "unsupported" from `notificationPermission()` — callers should fall back
 * to the in-app bell badge in that case.
 */

/**
 * Request permission to show browser notifications.
 * Returns true if permission is (or was just) granted, false otherwise.
 *
 * Safe to call repeatedly — if permission is already granted or denied,
 * the browser's promise resolves immediately without showing a prompt.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    const result = await Notification.requestPermission();
    return result === "granted";
  } catch {
    return false;
  }
}

/**
 * Show a browser notification. Silently does nothing if the browser doesn't
 * support notifications or the user hasn't granted permission.
 */
export function showBrowserNotification(
  title: string,
  options?: NotificationOptions,
): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    const n = new Notification(title, {
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      ...options,
    });
    // Auto-close after 6 seconds so the user isn't buried in stale toasts.
    setTimeout(() => {
      try {
        n.close();
      } catch {
        /* noop */
      }
    }, 6000);
    // Focus the window on click — typical PWA behavior.
    n.onclick = () => {
      try {
        window.focus();
        n.close();
      } catch {
        /* noop */
      }
    };
  } catch {
    /* Some browsers (iOS Safari) throw on `new Notification` even after
       permission is granted — silently ignore. The in-app bell still works. */
  }
}

/**
 * Get the current notification permission state. Returns "unsupported" if
 * the browser doesn't implement the Notification API.
 */
export function notificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}
