"use client";

import {
  CalendarDays,
  ChartColumnBig,
  Flame,
  Grid3x3,
  Medal,
  Plus,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";

import { BarChart } from "@/components/BarChart";
import { HabitIcon } from "@/components/HabitCheckRow";
import { YearHeatmap } from "@/components/YearHeatmap";
import {
  ButtonLink,
  Card,
  CardTitle,
  EmptyState,
  ErrorBanner,
  PageHeader,
  Skeleton,
  StatCard,
} from "@/components/ui";
import { useAsync } from "@/hooks/useAsync";
import { useToday } from "@/hooks/useToday";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { WEEKDAY_LABELS, addDays, formatShort, startOfWeek } from "@/lib/dates";
import { formatPercent, pluralize, statsById } from "@/lib/habits";
import type { ISODate } from "@/lib/types";

const INSIGHT_DAYS = 90;
const MIN_DAYS_FOR_PATTERNS = 7;

async function loadInsights(today: ISODate) {
  const heatmapStart = startOfWeek(addDays(today, -364));
  const [habits, summary, insights, heatmap] = await Promise.all([
    api.listHabits(true),
    api.getSummary(today),
    api.getInsights(today, INSIGHT_DAYS, 12),
    api.getCalendar(heatmapStart, today, today),
  ]);
  return { habits, summary, insights, heatmap };
}

export default function InsightsPage() {
  const today = useToday();
  const { data, error, reload } = useAsync(() => loadInsights(today!), [today], today !== null);

  if (error) return <ErrorBanner message={error} onRetry={reload} />;
  if (!data) return <InsightsSkeleton />;

  const { habits, summary, insights, heatmap } = data;
  if (habits.length === 0) {
    return (
      <>
        <PageHeader title="Insights" subtitle="Your patterns, trends and personal bests." />
        <EmptyState
          icon={ChartColumnBig}
          title="Nothing to analyse yet"
          action={
            <ButtonLink href="/habits/new" variant="brand">
              <Plus className="size-4" aria-hidden /> Create a habit
            </ButtonLink>
          }
        >
          Track a habit for a few days and this page will show your streaks, your strongest days and
          how you&apos;re trending week by week.
        </EmptyState>
      </>
    );
  }

  const stats = statsById(summary.habits);
  const ranked = [...habits].sort(
    (a, b) =>
      (stats.get(b.id)?.completion_rate_30d ?? 0) - (stats.get(a.id)?.completion_rate_30d ?? 0),
  );
  const trackedDays = heatmap.filter(
    (d) =>
      d.status !== "future" &&
      d.status !== "empty" &&
      d.status !== "pending" &&
      d.status !== "rest",
  );
  const overallRate = trackedDays.length
    ? trackedDays.reduce((sum, d) => sum + d.completed / d.total, 0) / trackedDays.length
    : 0;
  const weekdaysWithData = insights.weekdays.filter((d) => d.possible > 0);
  const bestWeekday = weekdaysWithData.reduce<(typeof weekdaysWithData)[number] | null>(
    (best, d) => (!best || d.rate > best.rate ? d : best),
    null,
  );
  const worstWeekday = weekdaysWithData.reduce<(typeof weekdaysWithData)[number] | null>(
    (worst, d) => (!worst || d.rate < worst.rate ? d : worst),
    null,
  );
  const fewData = trackedDays.length < MIN_DAYS_FOR_PATTERNS;

  return (
    <>
      <PageHeader title="Insights" subtitle="Your patterns, trends and personal bests." />

      {fewData && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-brand/20 bg-brand/5 p-4 text-sm">
          <Sparkles className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
          <p>
            <span className="font-semibold">Your insights are warming up.</span>{" "}
            <span className="text-muted">
              Keep checking in. Patterns become meaningful after about a week of tracking (
              {pluralize(trackedDays.length, "day")} so far).
            </span>
          </p>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <StatCard
          icon={Flame}
          tone="brand"
          label="Current streak"
          value={summary.current_streak}
          hint="days"
        />
        <StatCard
          icon={Trophy}
          tone="warn"
          label="Best streak"
          value={summary.longest_streak}
          hint="days"
        />
        <StatCard
          icon={Target}
          tone="ok"
          label="Avg. completion"
          value={formatPercent(overallRate)}
          hint="past year"
        />
        <StatCard
          icon={CalendarDays}
          label="Strongest day"
          value={bestWeekday ? WEEKDAY_LABELS[bestWeekday.weekday] : "–"}
          hint={
            worstWeekday && bestWeekday && worstWeekday !== bestWeekday
              ? `weakest: ${WEEKDAY_LABELS[worstWeekday.weekday]}`
              : `last ${INSIGHT_DAYS} days`
          }
        />
      </div>

      <div className="space-y-6">
        <Card>
          <CardTitle
            icon={Grid3x3}
            hint={`${pluralize(summary.perfect_days, "perfect day")} in total`}
          >
            Past year
          </CardTitle>
          <YearHeatmap days={heatmap} />
        </Card>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card>
            <CardTitle icon={CalendarDays} hint={`last ${INSIGHT_DAYS} days`}>
              By day of week
            </CardTitle>
            <BarChart
              bars={insights.weekdays.map((d) => ({
                key: String(d.weekday),
                label: WEEKDAY_LABELS[d.weekday],
                value: d.rate,
                tooltip: `${d.completed} of ${d.possible} habit-days done`,
              }))}
            />
          </Card>
          <Card>
            <CardTitle icon={TrendingUp} hint="last 12 weeks">
              Weekly completion
            </CardTitle>
            <BarChart
              bars={insights.weeks.map((w) => ({
                key: w.week_start,
                label: formatShort(w.week_start).replace(" ", " "),
                value: w.rate,
                tooltip: `Week of ${formatShort(w.week_start)}: ${w.completed} of ${w.possible} done`,
              }))}
            />
          </Card>
        </div>

        <Card>
          <CardTitle icon={Medal} hint="ranked by last 30 days">
            Habit leaderboard
          </CardTitle>
          <ol className="divide-y divide-line">
            {ranked.map((habit, i) => {
              const s = stats.get(habit.id);
              const rate = s?.completion_rate_30d ?? 0;
              return (
                <li
                  key={habit.id}
                  className={cn("flex items-center gap-3 py-3", habit.is_archived && "opacity-60")}
                >
                  <span
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold",
                      i === 0 && rate > 0 ? "bg-brand-gradient text-white" : "bg-subtle text-muted",
                    )}
                  >
                    {i + 1}
                  </span>
                  <HabitIcon habit={habit} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {habit.name}
                      {habit.is_archived && (
                        <span className="ml-2 text-xs font-normal text-muted">archived</span>
                      )}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-subtle">
                        <div
                          className="h-full rounded-full transition-[width] duration-700"
                          style={{ width: `${rate * 100}%`, backgroundColor: habit.color }}
                        />
                      </div>
                      <span className="w-10 text-right text-xs font-semibold tabular-nums">
                        {formatPercent(rate)}
                      </span>
                    </div>
                  </div>
                  <div className="hidden w-24 text-right text-xs text-muted sm:block">
                    <p className="inline-flex items-center gap-1 font-medium text-fg">
                      <Flame className="size-3.5 text-brand" aria-hidden />
                      {s?.current_streak ?? 0}
                    </p>
                    <p>best {s?.longest_streak ?? 0}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>
      </div>
    </>
  );
}

function InsightsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-48" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-56" />
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}
