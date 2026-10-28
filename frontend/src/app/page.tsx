"use client";

import { ChevronLeft, ChevronRight, ListChecks, Plus, Star, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { DayChecklist } from "@/components/DayChecklist";
import { Onboarding } from "@/components/Onboarding";
import { StreakHero } from "@/components/StreakHero";
import { Tour, WELCOME_TOUR } from "@/components/Tour";
import { Button, ButtonLink, EmptyState, ErrorBanner, Skeleton, StatCard } from "@/components/ui";
import { useAsync } from "@/hooks/useAsync";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToday } from "@/hooks/useToday";
import { finishTour, startTour, useTourPending } from "@/hooks/useTour";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { addDays, formatDate, formatLong } from "@/lib/dates";
import { greeting } from "@/lib/habits";
import type { ISODate } from "@/lib/types";

export default function TodayPage() {
  const today = useToday();
  const user = useCurrentUser();
  const tourPending = useTourPending();
  const [pickedDate, setPickedDate] = useState<ISODate | null>(null);
  // Decided once, on the first load with no habits, so onboarding survives adding habits.
  const [onboarding, setOnboarding] = useState<boolean | null>(null);
  const date = pickedDate ?? today;

  const habits = useAsync(() => api.listHabits(true), []);
  const summary = useAsync(() => api.getSummary(today!), [today], today !== null);

  if (onboarding === null && habits.data) setOnboarding(habits.data.length === 0);

  // First-time users get the walkthrough once they've added habits and reach the dashboard.
  useEffect(() => {
    if (onboarding) startTour();
  }, [onboarding]);

  const streaks = useMemo(
    () => new Map(summary.data?.habits.map((h) => [h.habit_id, h.current_streak])),
    [summary.data],
  );

  function refresh() {
    summary.reload();
    habits.reload();
  }

  if (habits.error) return <ErrorBanner message={habits.error} onRetry={habits.reload} />;
  if (!today || !date || !habits.data || onboarding === null) return <TodaySkeleton />;

  if (onboarding) {
    return <Onboarding today={today} onCreated={refresh} onFinish={() => setOnboarding(false)} />;
  }

  const hasActiveHabits = habits.data.some((h) => !h.is_archived);
  const isToday = date === today;
  const firstName = user?.name?.split(" ")[0] ?? user?.login;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
        <div>
          <p className="text-sm font-medium text-muted">{formatLong(today)}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            {greeting()}
            {firstName && <span className="text-brand-gradient">, {firstName}</span>}
          </h1>
        </div>
        <DateStepper date={date} today={today} onChange={setPickedDate} />
      </div>

      {tourPending && hasActiveHabits && isToday && (
        <Tour steps={WELCOME_TOUR} onClose={finishTour} />
      )}

      {summary.error && <ErrorBanner message={summary.error} onRetry={summary.reload} />}

      {hasActiveHabits && (
        <div className="mb-8 grid gap-3 md:grid-cols-[minmax(0,1fr)_11rem_11rem] md:gap-4">
          <StreakHero summary={summary.data} />
          <div className="grid grid-cols-2 gap-3 md:contents">
            <StatCard
              icon={Trophy}
              tone="warn"
              label="Best streak"
              value={summary.data?.longest_streak ?? "–"}
              hint="days in a row"
            />
            <StatCard
              icon={Star}
              tone="ok"
              label="Perfect days"
              value={summary.data?.perfect_days ?? "–"}
              hint="all time"
            />
          </div>
        </div>
      )}

      {hasActiveHabits || !isToday ? (
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold tracking-tight">
              {isToday ? "Today's habits" : formatLong(date)}
            </h2>
            {!isToday && <span className="text-xs font-medium text-brand">Editing a past day</span>}
          </div>
          <DayChecklist
            key={date}
            date={date}
            habits={habits.data}
            streaks={streaks}
            onChanged={refresh}
          />
        </section>
      ) : (
        <EmptyState
          icon={ListChecks}
          title="No active habits"
          action={
            <ButtonLink href="/habits/new" variant="brand">
              <Plus className="size-4" aria-hidden /> Add a habit
            </ButtonLink>
          }
        >
          All your habits are archived. Restore one or add something new to start a fresh streak.
        </EmptyState>
      )}
    </>
  );
}

function DateStepper({
  date,
  today,
  onChange,
}: {
  date: ISODate;
  today: ISODate;
  onChange: (date: ISODate | null) => void;
}) {
  const isToday = date === today;
  return (
    <div data-tour="date" className="flex w-full items-center gap-2 sm:w-auto">
      <div className="flex flex-1 items-center rounded-xl border border-line bg-surface p-1 shadow-card sm:flex-none">
        <Button
          variant="ghost"
          size="icon"
          className="size-9"
          aria-label="Previous day"
          onClick={() => onChange(addDays(date, -1))}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <label className="relative flex-1 cursor-pointer px-2 text-center text-sm font-medium sm:min-w-32">
          {isToday
            ? "Today"
            : formatDate(date, { weekday: "short", month: "short", day: "numeric" })}
          <input
            type="date"
            aria-label="Pick a date"
            value={date}
            max={today}
            onChange={(e) =>
              e.target.value && onChange(e.target.value === today ? null : e.target.value)
            }
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
        <Button
          variant="ghost"
          size="icon"
          className="size-9"
          aria-label="Next day"
          disabled={isToday}
          onClick={() => {
            const next = addDays(date, 1);
            onChange(next === today ? null : next);
          }}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
      <Button
        variant="secondary"
        size="sm"
        className={cn("h-11", isToday && "hidden")}
        onClick={() => onChange(null)}
      >
        Today
      </Button>
    </div>
  );
}

function TodaySkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-9 w-64" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-[minmax(0,1fr)_11rem_11rem]">
        <Skeleton className="col-span-2 h-32 md:col-span-1" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <div className="space-y-2.5">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-[76px]" />
        ))}
      </div>
    </div>
  );
}
