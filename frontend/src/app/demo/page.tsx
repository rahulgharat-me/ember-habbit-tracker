"use client";

import { CalendarDays, CheckCheck, Eye, Grid3x3, Star, Trophy } from "lucide-react";
import { useMemo, useState } from "react";

import { BarChart } from "@/components/BarChart";
import { celebrate } from "@/components/DayChecklist";
import { HabitCheckRow } from "@/components/HabitCheckRow";
import { Logo } from "@/components/Logo";
import { MonthCalendar, StatusLegend } from "@/components/MonthCalendar";
import { StreakHero } from "@/components/StreakHero";
import { YearHeatmap } from "@/components/YearHeatmap";
import { Button, ButtonLink, Card, CardTitle, Skeleton, StatCard } from "@/components/ui";
import { useToday } from "@/hooks/useToday";
import { WEEKDAY_LABELS, endOfMonth, formatLong, formatMonth, startOfMonth } from "@/lib/dates";
import {
  type DemoData,
  buildDemo,
  calendarDays,
  habitStreak,
  heatmapStart,
  streaks,
  weekdayStats,
} from "@/lib/demo";
import { greeting, isHabitActiveOn, pluralize } from "@/lib/habits";
import type { ISODate, Summary } from "@/lib/types";

const INSIGHT_DAYS = 90;

/** Public, read-only showcase of the app with sample data. Nothing is sent to the backend. */
export default function DemoPage() {
  const today = useToday();
  if (!today) return <Skeleton className="h-96" />;
  return <Demo key={today} today={today} />;
}

function Demo({ today }: { today: ISODate }) {
  const [data, setData] = useState<DemoData>(() => buildDemo(today));
  const [selected, setSelected] = useState<ISODate | null>(today);

  const scheduled = data.habits.filter((h) => isHabitActiveOn(h, today));
  const heatmap = useMemo(
    () => calendarDays(data, today, heatmapStart(today), today),
    [data, today],
  );
  const month = useMemo(
    () => calendarDays(data, today, startOfMonth(today), endOfMonth(today)),
    [data, today],
  );
  const weekdays = useMemo(() => weekdayStats(data, today, INSIGHT_DAYS), [data, today]);

  const { current, longest, perfect } = streaks(heatmap, today);
  const done = scheduled.filter((h) => data.todayMarks[h.id]).length;
  const summary: Summary = {
    today,
    current_streak: current,
    longest_streak: longest,
    perfect_days: perfect,
    today_total: scheduled.length,
    today_completed: done,
    habits: [],
  };

  function mark(changes: Record<number, boolean | null>) {
    const todayMarks = { ...data.todayMarks };
    for (const [id, value] of Object.entries(changes)) {
      if (value === null) delete todayMarks[Number(id)];
      else todayMarks[Number(id)] = value;
    }
    if (done < scheduled.length && scheduled.every((h) => todayMarks[h.id])) celebrate();
    setData({ ...data, todayMarks });
  }

  const selectedDay = month.find((d) => d.date === selected);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Logo />
        <div className="flex gap-2">
          <ButtonLink href="/about" variant="ghost" size="sm">
            About
          </ButtonLink>
          <ButtonLink href="/login" variant="brand" size="sm">
            Sign in
          </ButtonLink>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-brand/20 bg-brand/5 p-4 text-sm">
        <Eye className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
        <p>
          <span className="font-semibold">You&apos;re looking at a demo with sample data.</span>{" "}
          <span className="text-muted">
            Tick off today&apos;s habits to see the streak react. Nothing is saved, and reloading
            starts over.
          </span>
        </p>
      </div>

      <div>
        <p className="text-sm font-medium text-muted">{formatLong(today)}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          {greeting()}
          <span className="text-brand-gradient">, Alex</span>
        </h1>
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_11rem_11rem] md:gap-4">
        <StreakHero summary={summary} />
        <div className="grid grid-cols-2 gap-3 md:contents">
          <StatCard
            icon={Trophy}
            tone="warn"
            label="Best streak"
            value={longest}
            hint="days in a row"
          />
          <StatCard icon={Star} tone="ok" label="Perfect days" value={perfect} hint="all time" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight">Today&apos;s habits</h2>
            {done < scheduled.length && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => mark(Object.fromEntries(scheduled.map((h) => [h.id, true])))}
                className="text-brand hover:text-brand"
              >
                <CheckCheck className="size-4" aria-hidden /> Mark all done
              </Button>
            )}
          </div>
          <p className="mb-3 text-sm text-muted">
            <span className="font-semibold text-fg tabular-nums">{done}</span> of {scheduled.length}{" "}
            done
          </p>
          <ul className="space-y-2.5">
            {scheduled.map((habit) => (
              <HabitCheckRow
                key={habit.id}
                habit={habit}
                mark={data.todayMarks[habit.id]}
                streak={habitStreak(data, today, habit)}
                onMark={(value) => mark({ [habit.id]: value })}
              />
            ))}
          </ul>
        </section>

        <Card>
          <CardTitle
            icon={CalendarDays}
            hint={
              selectedDay && selectedDay.total > 0
                ? `${selectedDay.completed}/${selectedDay.total} on ${formatLong(selectedDay.date)}`
                : undefined
            }
          >
            {formatMonth(today)}
          </CardTitle>
          <MonthCalendar days={month} today={today} selected={selected} onSelect={setSelected} />
          <div className="mt-4">
            <StatusLegend statuses={["complete", "partial", "missed", "rest", "pending"]} />
          </div>
        </Card>
      </div>

      <Card>
        <CardTitle icon={Grid3x3} hint={`${pluralize(perfect, "perfect day")} in total`}>
          Past year
        </CardTitle>
        <YearHeatmap days={heatmap} />
      </Card>

      <Card>
        <CardTitle icon={CalendarDays} hint={`last ${INSIGHT_DAYS} days`}>
          By day of week
        </CardTitle>
        <BarChart
          bars={weekdays.map((d) => ({
            key: String(d.weekday),
            label: WEEKDAY_LABELS[d.weekday],
            value: d.rate,
            tooltip: `${d.completed} of ${d.possible} habit-days done`,
          }))}
        />
      </Card>
    </div>
  );
}
