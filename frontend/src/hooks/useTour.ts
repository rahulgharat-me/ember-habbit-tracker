"use client";

import { useSyncExternalStore } from "react";

// Whether the welcome tour should run on the Today page. Kept in localStorage so it survives a
// detour (e.g. adding a custom habit on /habits/new) between onboarding and the Today page.
const KEY = "ember:tour-pending";
const listeners = new Set<() => void>();
// Used when storage is blocked (e.g. private mode), so the tour still works for this page load.
let fallback = false;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function read(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return fallback;
  }
}

function write(pending: boolean) {
  fallback = pending;
  try {
    if (pending) window.localStorage.setItem(KEY, "1");
    else window.localStorage.removeItem(KEY);
  } catch {
    // Storage blocked: `fallback` covers this page load.
  }
  listeners.forEach((notify) => notify());
}

/** Queues the tour; it starts the next time the Today page shows the user's habits. */
export function startTour() {
  write(true);
}

/** Called when the user finishes or skips the tour. */
export function finishTour() {
  write(false);
}

export function useTourPending(): boolean {
  return useSyncExternalStore(subscribe, read, () => false);
}
