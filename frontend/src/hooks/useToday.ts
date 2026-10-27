"use client";

import { useSyncExternalStore } from "react";

import { todayISO } from "@/lib/dates";
import type { ISODate } from "@/lib/types";

function subscribe(onChange: () => void) {
  // Re-check every minute so the app rolls over at midnight.
  const id = window.setInterval(onChange, 60_000);
  return () => window.clearInterval(id);
}

/**
 * The user's local date. Returns `null` during server rendering, because the server's date
 * may differ from the browser's.
 */
export function useToday(): ISODate | null {
  return useSyncExternalStore(subscribe, todayISO, () => null);
}
