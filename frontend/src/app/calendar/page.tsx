"use client";

import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MousePointerClick,
  Percent,
  Plus,
  Star,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { DayChecklist } from "@/components/DayChecklist";
import { MonthCalendar, StatusLegend } from "@/components/MonthCalendar";
import {
  Button,
  ButtonLink,
  Card,
  EmptyState,
  ErrorBanner,
  PageHeader,
  Skeleton,
} from "@/components/ui";
import { useAsync } from "@/hooks/useAsync";
import { useToday } from "@/hooks/useToday";
import { api } from "@/lib/api";
import { addMonths, endOfMonth, formatLong, formatMonth, startOfMonth } from "@/lib/dates";
import { formatPercent } from "@/lib/habits";
import type { ISODate } from "@/lib/types";

export default function CalendarPage() {
  const today = useToday();
  const [pickedMonth, setPickedMonth] = useState<ISODate | null>(null);
  const [selected, setSelected] = useState<ISODate | null>(null);
  const [habitId, setHabitId] = useState<number | undefined>(undefined);
  const detailsRef = useRef<HTMLDivElement>(null);

  const month = pickedMonth ?? (today ? startOfMonth(today) : null);
  const habits = useAsync(() => api.listHabits(true), []);
  const calendar = useAsync(
    () => api.getCalendar(month!, endOfMonth(month!), today!, habitId),
    [month, today, habitId],
    month !== null && today !== null,
  );

  const monthStats = useMemo(() => {
    const past = (calendar.data ?? []).filter((d) => d.status !== "future" && d.total > 0);
    const possible = past.reduce((sum, d) => sum + d.total, 0);
    const completed = past.reduce((sum, d) => sum + d.completed, 0);
    return {
      perfect: past.filter((d) => d.status === "complete").length,
      rate: possible ? completed / possible : 0,
    };
  }, [calendar.data]);

  const visibleHabits = useMemo(
    () => (habits.data ?? []).filter((h) => habitId === undefined || h.id === habitId),
    [habits.data, habitId],
  );

  if (!today || !month || !habits.data) {
    return habits.error ? (
      <ErrorBanner message={habits.error} onRetry={habits.reload} />
    ) : (
      <CalendarSkeleton />
    );
  }

  if (habits.data.length === 0) {
    return (
      <>
        <PageHeader title="Calendar" subtitle="Every day of your journey at a glance." />
        <EmptyState
          icon={CalendarDays}
          title="Your calendar is waiting"
          action={
            <ButtonLink href="/habits/new" variant="brand">
              <Plus className="size-4" aria-hidden /> Create a habit
            </ButtonLink>
          }
        >
          Once you track a habit, each day fills in here: green for perfect days, amber for partly
          done, red for missed.
        </EmptyState>
      </>
    );
  }

  const isCurrentMonth = month === startOfMonth(today);

  function selectDay(day: ISODate) {
    setSelected(day);
    // Single-column layout: the details card is below the calendar, so bring it in.
    if (window.matchMedia("(max-width: 1023px)").matches) {
      requestAnimationFrame(() =>
        detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    }
  }

  return (
    <>
      <PageHeader
        title="Calendar"
        subtitle="Tap any day to review or change it."
        actions={
          <label className="relative w-full sm:w-auto">
            <span className="sr-only">Filter by habit</span>
            <select
              value={habitId ?? ""}
              onChange={(e) => setHabitId(e.target.value ? Number(e.target.value) : undefined)}
              className="h-11 w-full appearance-none rounded-xl border border-line bg-surface pr-10 pl-3.5 text-base font-medium shadow-card outline-none focus:ring-4 focus:ring-brand/15 sm:w-56 sm:text-sm"
            >
              <option value="">All habits</option>
              {habits.data.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.icon} {h.name}
                  {h.is_archived ? " (archived)" : ""}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-muted" />
          </label>
        }
      />

      {calendar.error && <ErrorBanner message={calendar.error} onRetry={calendar.reload} />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          <div className="mb-5 flex items-center justify-between">
            <Button
              variant="secondary"
              size="icon"
              aria-label="Previous month"
              onClick={() => setPickedMonth(addMonths(month, -1))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <h2 className="text-lg font-semibold tracking-tight">{formatMonth(month)}</h2>
            <Button
              variant="secondary"
              size="icon"
              aria-label="Next month"
              disabled={isCurrentMonth}
              onClick={() => setPickedMonth(addMonths(month, 1))}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          {calendar.data ? (
            <MonthCalendar
              days={calendar.data}
              today={today}
              selected={selected}
              onSelect={selectDay}
            />
          ) : (
            <Skeleton className="aspect-[7/5.5]" />
          )}

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3 rounded-xl bg-subtle p-3">
              <Star className="size-5 text-ok" aria-hidden />
              <div>
                <p className="text-lg leading-tight font-semibold tabular-nums">
                  {monthStats.perfect}
                </p>
                <p className="text-xs text-muted">
                  perfect {monthStats.perfect === 1 ? "day" : "days"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-subtle p-3">
              <Percent className="size-5 text-brand" aria-hidden />
              <div>
                <p className="text-lg leading-tight font-semibold tabular-nums">
                  {formatPercent(monthStats.rate)}
                </p>
                <p className="text-xs text-muted">completion</p>
              </div>
            </div>
          </div>
          <div className="mt-4 border-t border-line pt-4">
            <StatusLegend statuses={["complete", "partial", "missed", "pending", "rest"]} />
          </div>
        </Card>

        <div ref={detailsRef} className="scroll-mt-20">
          <Card className="lg:sticky lg:top-24">
            {selected ? (
              <>
                <div className="mb-4">
                  <p className="text-xs font-semibold tracking-wider text-muted uppercase">
                    {selected === today ? "Today" : "Selected day"}
                  </p>
                  <h2 className="text-lg font-semibold tracking-tight">{formatLong(selected)}</h2>
                </div>
                <DayChecklist
                  key={selected}
                  date={selected}
                  habits={visibleHabits}
                  onChanged={() => {
                    calendar.reload();
                    habits.reload();
                  }}
                />
              </>
            ) : (
              <div className="py-8 text-center">
                <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-subtle">
                  <MousePointerClick className="size-6 text-muted" aria-hidden />
                </div>
                <p className="mt-3 font-medium">Pick a day</p>
                <p className="mt-1 text-sm text-muted">
                  Select a date to see its habits, fix a missed check-in, or take a day off.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

function CalendarSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-48" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Skeleton className="h-[34rem]" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}
