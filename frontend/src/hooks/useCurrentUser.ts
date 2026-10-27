"use client";

import { useEffect, useSyncExternalStore } from "react";

import { api } from "@/lib/api";
import type { CurrentUser } from "@/lib/types";

// A tiny shared store: one request per page load, and every component re-renders when
// `reloadCurrentUser()` refreshes it (e.g. the pending-requests badge after an approval).
let current: CurrentUser | null = null;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function reloadCurrentUser(): Promise<void> {
  inflight = api.me().then(
    (user) => {
      current = user;
      listeners.forEach((notify) => notify());
    },
    () => {
      inflight = null; // allow a later retry
    },
  );
  return inflight;
}

export function useCurrentUser(): CurrentUser | null {
  const user = useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
  useEffect(() => {
    if (!inflight) void reloadCurrentUser();
  }, []);
  return user;
}
