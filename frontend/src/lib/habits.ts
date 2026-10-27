import { WEEKDAY_LABELS, weekdayIndex } from "@/lib/dates";
import type { Habit, HabitStats, ISODate } from "@/lib/types";

/** Preset swatches, in hue order; the form adds a custom color picker after them. */
export const HABIT_COLORS = [
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#0ea5e9",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#d946ef",
  "#ec4899",
  "#f43f5e",
  "#ef4444",
  "#64748b",
  "#78716c",
];

/** Preset icon tiles; the form adds an emoji picker after them for anything else. */
export const HABIT_ICONS = [
  "✅",
  "📚",
  "🏃",
  "💧",
  "🧘",
  "🥗",
  "😴",
  "✍️",
  "🎸",
  "💪",
  "🧹",
  "💊",
  "🚶",
  "🧠",
  "🌱",
  "☀️",
  "📵",
  "🎨",
  "💰",
  "🙏",
  "🤸",
  "🥤",
  "🦷",
  "📞",
  "📝",
  "🚴",
  "🍎",
  "🎧",
  "🎯",
];

export interface HabitTemplate {
  name: string;
  icon: string;
  color: string;
  description: string;
}

/** One-tap starter habits offered on the empty first-run screen. */
export const HABIT_TEMPLATES: HabitTemplate[] = [
  { name: "Drink 8 glasses of water", icon: "💧", color: "#0ea5e9", description: "Stay hydrated" },
  { name: "Read 20 pages", icon: "📚", color: "#6366f1", description: "A little every day" },
  { name: "Move for 30 minutes", icon: "🏃", color: "#10b981", description: "Walk, run or lift" },
  { name: "Meditate for 10 minutes", icon: "🧘", color: "#a855f7", description: "Clear the mind" },
  { name: "In bed by 11 pm", icon: "😴", color: "#78716c", description: "Protect your sleep" },
  {
    name: "Write a journal entry",
    icon: "✍️",
    color: "#f97316",
    description: "Reflect on the day",
  },
  { name: "Eat a serving of veggies", icon: "🥗", color: "#84cc16", description: "Fuel your body" },
  {
    name: "No phone for the first hour",
    icon: "📵",
    color: "#f43f5e",
    description: "Own your morning",
  },
  {
    name: "Practice an instrument",
    icon: "🎸",
    color: "#ec4899",
    description: "15 minutes counts",
  },
  { name: "Take your vitamins", icon: "💊", color: "#14b8a6", description: "Same time each day" },
  { name: "Save some money", icon: "💰", color: "#eab308", description: "Even a little adds up" },
  {
    name: "Write down one gratitude",
    icon: "🙏",
    color: "#f97316",
    description: "Notice the good",
  },
  { name: "Do 20 push-ups", icon: "💪", color: "#f43f5e", description: "Build strength" },
  {
    name: "Take a 10-minute walk",
    icon: "🚶",
    color: "#10b981",
    description: "Get some fresh air",
  },
  { name: "Stretch for 10 minutes", icon: "🤸", color: "#14b8a6", description: "Stay limber" },
  {
    name: "Tidy up for 10 minutes",
    icon: "🧹",
    color: "#78716c",
    description: "Calm space, calm mind",
  },
  {
    name: "Learn something new",
    icon: "🧠",
    color: "#6366f1",
    description: "A course, podcast or article",
  },
  { name: "Water the plants", icon: "🌱", color: "#84cc16", description: "Keep them thriving" },
  {
    name: "Get morning sunlight",
    icon: "☀️",
    color: "#eab308",
    description: "Set your body clock",
  },
  { name: "Draw or sketch", icon: "🎨", color: "#ec4899", description: "Doodles count too" },
  { name: "No sugary drinks", icon: "🥤", color: "#0ea5e9", description: "Swap for water or tea" },
  {
    name: "Floss your teeth",
    icon: "🦷",
    color: "#a855f7",
    description: "Your dentist will thank you",
  },
  { name: "Call a friend or family", icon: "📞", color: "#f97316", description: "Stay connected" },
  { name: "Plan tomorrow", icon: "📝", color: "#6366f1", description: "Pick your top 3 tasks" },
];

export const SCHEDULE_PRESETS: { label: string; skipWeekdays: number[] }[] = [
  { label: "Every day", skipWeekdays: [] },
  { label: "Weekdays", skipWeekdays: [5, 6] },
  { label: "Weekends", skipWeekdays: [0, 1, 2, 3, 4] },
];

/** Tracked from `start_date` until (excluding) `archived_on`. */
export function isHabitTrackedOn(habit: Habit, day: ISODate): boolean {
  return habit.start_date <= day && (habit.archived_on === null || day < habit.archived_on);
}

export type DayOffReason = "weekday" | "date";

/** Why a tracked habit is not required on `day`, or `null` when it is scheduled. */
export function dayOffReason(habit: Habit, day: ISODate): DayOffReason | null {
  if (habit.skip_weekdays.includes(weekdayIndex(day))) return "weekday";
  if (habit.skip_dates.includes(day)) return "date";
  return null;
}

/** Mirrors the backend rule: tracked on `day` and not excluded by a weekly or one-off day off. */
export function isHabitActiveOn(habit: Habit, day: ISODate): boolean {
  return isHabitTrackedOn(habit, day) && dayOffReason(habit, day) === null;
}

export function scheduleLabel(skipWeekdays: number[]): string {
  const preset = SCHEDULE_PRESETS.find(
    (p) =>
      p.skipWeekdays.length === skipWeekdays.length &&
      p.skipWeekdays.every((d) => skipWeekdays.includes(d)),
  );
  if (preset) return preset.label;
  const scheduled = WEEKDAY_LABELS.filter((_, i) => !skipWeekdays.includes(i));
  return skipWeekdays.length <= 3
    ? `Every day except ${skipWeekdays.map((d) => WEEKDAY_LABELS[d]).join(", ")}`
    : `Only ${scheduled.join(", ")}`;
}

export function statsById(stats: HabitStats[] | undefined): Map<number, HabitStats> {
  return new Map((stats ?? []).map((s) => [s.habit_id, s]));
}

export function formatPercent(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

export function pluralize(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

export function greeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
