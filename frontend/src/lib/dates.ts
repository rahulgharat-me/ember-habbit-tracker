import type { ISODate } from "@/lib/types";

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function toISODate(date: Date): ISODate {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parses `YYYY-MM-DD` as a local date (avoids the UTC shift of `new Date(iso)`). */
export function parseISODate(iso: ISODate): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayISO(): ISODate {
  return toISODate(new Date());
}

export function addDays(iso: ISODate, days: number): ISODate {
  const date = parseISODate(iso);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

export function addMonths(iso: ISODate, months: number): ISODate {
  const date = parseISODate(iso);
  return toISODate(new Date(date.getFullYear(), date.getMonth() + months, 1));
}

export function startOfMonth(iso: ISODate): ISODate {
  const date = parseISODate(iso);
  return toISODate(new Date(date.getFullYear(), date.getMonth(), 1));
}

export function endOfMonth(iso: ISODate): ISODate {
  const date = parseISODate(iso);
  return toISODate(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

/** Monday-based weekday: 0 = Monday, 6 = Sunday. */
export function weekdayIndex(iso: ISODate): number {
  return (parseISODate(iso).getDay() + 6) % 7;
}

export function startOfWeek(iso: ISODate): ISODate {
  return addDays(iso, -weekdayIndex(iso));
}

export function formatDate(iso: ISODate, options: Intl.DateTimeFormatOptions): string {
  return parseISODate(iso).toLocaleDateString(undefined, options);
}

export const formatLong = (iso: ISODate) =>
  formatDate(iso, { weekday: "long", month: "long", day: "numeric" });

export const formatShort = (iso: ISODate) => formatDate(iso, { month: "short", day: "numeric" });

export const formatMonth = (iso: ISODate) => formatDate(iso, { month: "long", year: "numeric" });

/** "3 hours ago" for an API timestamp (naive UTC). */
export function formatRelative(utcTimestamp: string, now = new Date()): string {
  const hasZone = /(?:[zZ]|[+-]\d\d:?\d\d)$/.test(utcTimestamp);
  const iso = hasZone ? utcTimestamp : `${utcTimestamp}Z`;
  const seconds = Math.round((new Date(iso).getTime() - now.getTime()) / 1000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];
  const format = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit);
  }
  return "just now";
}
