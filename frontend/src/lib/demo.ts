/**
 * Sample data for the public demo page (/demo). Everything is generated in the browser relative to
 * the visitor's today and follows the same rules as backend/app/services/streaks.py.
 */
import { addDays, startOfWeek, weekdayIndex } from "@/lib/dates";
import { isHabitActiveOn, isHabitTrackedOn } from "@/lib/habits";
import type { CalendarDay, DayStatus, Habit, ISODate, WeekdayStat } from "@/lib/types";

const HISTORY_DAYS = 120;
/** Every habit is done on the most recent days, so the demo opens on a live streak. */
const CURRENT_RUN = 12;
/** An older, longer perfect run, so "Best streak" beats the current one. */
const BEST_RUN = { from: 70, to: 49 };
/** A holiday that shows off one-off days off. */
const HOLIDAY_DAYS_AGO = 30;

// [name, description, icon, color, skip weekdays, days since start, completion rate]
const SAMPLES: [string, string | null, string, string, number[], number, number][] = [
  ["Drink 2L of water", null, "💧", "#0ea5e9", [], HISTORY_DAYS, 0.9],
  ["Read 20 pages", "Fiction counts too", "📚", "#8b5cf6", [], HISTORY_DAYS, 0.8],
  ["Workout", "Gym or a 5k run", "💪", "#f97316", [2, 6], HISTORY_DAYS, 0.75],
  ["Meditate", "10 minutes, morning", "🧘", "#10b981", [], 90, 0.7],
  ["No phone after 10pm", null, "📵", "#ec4899", [4, 5], 60, 0.65],
];
/** Already checked off today; the rest are left for the visitor. */
const DONE_TODAY = [1, 2];

export interface DemoData {
  habits: Habit[];
  /** Past days only, keyed by `logKey`. Today's marks live in page state. */
  logs: Map<string, boolean>;
  todayMarks: Record<number, boolean>;
}

export const logKey = (habitId: number, day: ISODate) => `${habitId}:${day}`;

/** Small seeded PRNG so every visitor sees the same history. */
function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildDemo(today: ISODate): DemoData {
  const next = random(7);
  const holiday = addDays(today, -HOLIDAY_DAYS_AGO);
  const habits: Habit[] = SAMPLES.map(([name, description, icon, color, skip, age], i) => ({
    id: i + 1,
    name,
    description,
    icon,
    color,
    start_date: addDays(today, -age),
    archived_on: null,
    is_archived: false,
    skip_weekdays: skip,
    skip_dates: [holiday],
  }));

  const logs = new Map<string, boolean>();
  for (let ago = HISTORY_DAYS; ago >= 1; ago--) {
    const day = addDays(today, -ago);
    const perfect = ago <= CURRENT_RUN || (ago <= BEST_RUN.from && ago >= BEST_RUN.to);
    habits.forEach((habit, i) => {
      if (!isHabitActiveOn(habit, day)) return;
      logs.set(logKey(habit.id, day), perfect || next() < SAMPLES[i][6]);
    });
  }
  const todayMarks = Object.fromEntries(DONE_TODAY.map((id) => [id, true]));
  return { habits, logs, todayMarks };
}

/** Whether `habit` was done on `day`, counting the visitor's marks for today. */
function isDone(data: DemoData, today: ISODate, habitId: number, day: ISODate): boolean {
  return day === today
    ? data.todayMarks[habitId] === true
    : data.logs.get(logKey(habitId, day)) === true;
}

export function calendarDays(data: DemoData, today: ISODate, start: ISODate, end: ISODate) {
  const days: CalendarDay[] = [];
  for (let day = start; day <= end; day = addDays(day, 1)) {
    const scheduled = data.habits.filter((h) => isHabitActiveOn(h, day));
    const rest = scheduled.length === 0 && data.habits.some((h) => isHabitTrackedOn(h, day));
    const completed = scheduled.filter((h) => isDone(data, today, h.id, day)).length;
    const total = day > today ? 0 : scheduled.length;
    days.push({
      date: day,
      total,
      completed,
      missed: day < today ? total - completed : 0,
      status: dayStatus(total, completed, day, today, rest),
    });
  }
  return days;
}

function dayStatus(
  total: number,
  completed: number,
  day: ISODate,
  today: ISODate,
  rest: boolean,
): DayStatus {
  if (day > today) return rest ? "rest" : "future";
  if (total === 0) return rest ? "rest" : "empty";
  if (completed === total) return "complete";
  if (day === today) return "pending";
  return completed ? "partial" : "missed";
}

/** Current and longest streak of perfect days; an unfinished today doesn't break it. */
export function streaks(days: CalendarDay[], today: ISODate) {
  let current = 0;
  let longest = 0;
  for (const day of days) {
    if (day.total === 0) continue;
    if (day.completed === day.total) longest = Math.max(longest, ++current);
    else if (day.date < today) current = 0;
  }
  return { current, longest, perfect: days.filter((d) => d.status === "complete").length };
}

/** Consecutive done days of one habit, ending today (or yesterday while today is open). */
export function habitStreak(data: DemoData, today: ISODate, habit: Habit): number {
  let count = 0;
  for (let day = today; isHabitTrackedOn(habit, day); day = addDays(day, -1)) {
    if (!isHabitActiveOn(habit, day)) continue;
    if (isDone(data, today, habit.id, day)) count++;
    else if (day !== today) break;
  }
  return count;
}

/** Completion rate per weekday over the past `days`, excluding today. */
export function weekdayStats(data: DemoData, today: ISODate, days: number): WeekdayStat[] {
  const stats = Array.from({ length: 7 }, (_, weekday) => ({ weekday, possible: 0, completed: 0 }));
  for (let ago = days; ago >= 1; ago--) {
    const day = addDays(today, -ago);
    for (const habit of data.habits) {
      if (!isHabitActiveOn(habit, day)) continue;
      const stat = stats[weekdayIndex(day)];
      stat.possible++;
      if (isDone(data, today, habit.id, day)) stat.completed++;
    }
  }
  return stats.map((s) => ({ ...s, rate: s.possible ? s.completed / s.possible : 0 }));
}

/** Monday-aligned start of the heatmap range (about a year back, like the Insights page). */
export const heatmapStart = (today: ISODate) => startOfWeek(addDays(today, -364));
