"use client";

import confetti from "canvas-confetti";
import { CalendarClock, CheckCheck, Coffee, PartyPopper, Undo2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { HabitCheckRow, HabitIcon } from "@/components/HabitCheckRow";
import { Button, EmptyState, ErrorBanner, Skeleton } from "@/components/ui";
import { useAsync } from "@/hooks/useAsync";
import { api, errorMessage } from "@/lib/api";
import { WEEKDAY_LABELS, weekdayIndex } from "@/lib/dates";
import { type DayOffReason, dayOffReason, isHabitTrackedOn } from "@/lib/habits";
import type { Habit, ISODate } from "@/lib/types";

interface Props {
  date: ISODate;
  habits: Habit[];
  streaks?: Map<number, number>;
  /**
   * Called after every successful change so parents can refresh derived stats. Parents must
   * also reload `habits`, since taking a day off changes a habit's schedule.
   */
  onChanged?: () => void;
}

function celebrate() {
  const colors = ["#fdba74", "#f97316", "#e11d48", "#10b981"];
  void confetti({
    particleCount: 90,
    spread: 75,
    origin: { y: 0.7 },
    colors,
    disableForReducedMotion: true,
  });
}

/**
 * Lets the user mark each habit scheduled on `date` as done / missed, or take a day off.
 * Render with `key={date}` so state resets when the date changes.
 */
export function DayChecklist({ date, habits, streaks, onChanged }: Props) {
  const { scheduled, off } = useMemo(() => {
    const tracked = habits.filter((h) => isHabitTrackedOn(h, date));
    return {
      scheduled: tracked.filter((h) => dayOffReason(h, date) === null),
      off: tracked
        .map((habit) => ({ habit, reason: dayOffReason(habit, date) }))
        .filter((entry): entry is { habit: Habit; reason: DayOffReason } => entry.reason !== null),
    };
  }, [habits, date]);

  const logs = useAsync(() => api.listLogs(date, date), [date]);
  const [marks, setMarks] = useState<Record<number, boolean>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (logs.data) setMarks(Object.fromEntries(logs.data.map((l) => [l.habit_id, l.completed])));
  }, [logs.data]);

  const isAllDone = (state: Record<number, boolean>) =>
    scheduled.length > 0 && scheduled.every((h) => state[h.id] === true);

  async function run(action: () => Promise<unknown>, rollback?: () => void) {
    setBusy(true);
    try {
      await action();
      onChanged?.();
      return true;
    } catch (error) {
      rollback?.();
      toast.error(errorMessage(error));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function applyMarks(changes: Record<number, boolean | null>) {
    const previous = marks;
    const next = { ...marks };
    for (const [id, value] of Object.entries(changes)) {
      if (value === null) delete next[Number(id)];
      else next[Number(id)] = value;
    }
    setMarks(next); // optimistic
    const ok = await run(
      () =>
        Promise.all(
          Object.entries(changes).map(([id, value]) =>
            value === null ? api.clearLog(Number(id), date) : api.setLog(Number(id), date, value),
          ),
        ),
      () => setMarks(previous),
    );
    if (ok && !isAllDone(previous) && isAllDone(next)) celebrate();
  }

  async function takeDayOff(habit: Habit) {
    if (await run(() => api.addSkipDate(habit.id, date))) {
      toast(`${habit.name} is off for this day`, {
        action: {
          label: "Undo",
          onClick: () => void run(() => api.removeSkipDate(habit.id, date)),
        },
      });
    }
  }

  if (logs.error) return <ErrorBanner message={logs.error} onRetry={logs.reload} />;
  if (!logs.data) {
    return (
      <div className="space-y-2.5">
        {Array.from({ length: Math.max(scheduled.length, 3) }, (_, i) => (
          <Skeleton key={i} className="h-[76px]" />
        ))}
      </div>
    );
  }
  if (scheduled.length === 0 && off.length === 0) {
    return (
      <EmptyState icon={CalendarClock} title="Nothing to track on this day">
        Habits only count from their start date. Pick a later day, or move a habit&apos;s start date
        earlier.
      </EmptyState>
    );
  }

  const doneCount = scheduled.filter((h) => marks[h.id] === true).length;
  const allDone = isAllDone(marks);
  const remaining = scheduled.filter((h) => marks[h.id] !== true);

  return (
    <div>
      {scheduled.length === 0 ? (
        <EmptyState icon={Coffee} title="Rest day" className="mb-6">
          Nothing is scheduled today. Enjoy the break: your streak carries over.
        </EmptyState>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm text-muted">
              <span className="font-semibold text-fg tabular-nums">{doneCount}</span> of{" "}
              {scheduled.length} done
            </p>
            {!allDone && (
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => applyMarks(Object.fromEntries(remaining.map((h) => [h.id, true])))}
                className="text-brand hover:text-brand"
              >
                <CheckCheck className="size-4" aria-hidden /> Mark all done
              </Button>
            )}
          </div>

          <AnimatePresence>
            {allDone && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mb-3 flex items-center gap-3 rounded-2xl border border-ok/20 bg-ok/10 px-4 py-3 text-sm text-ok">
                  <PartyPopper className="size-5 shrink-0" aria-hidden />
                  <p>
                    <span className="font-semibold">Perfect day!</span> Every habit is done. Your
                    streak keeps burning.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <ul className="space-y-2.5">
            {scheduled.map((habit) => (
              <HabitCheckRow
                key={habit.id}
                habit={habit}
                mark={marks[habit.id]}
                streak={streaks?.get(habit.id)}
                disabled={busy}
                onMark={(value) => applyMarks({ [habit.id]: value })}
                onSkip={() => takeDayOff(habit)}
              />
            ))}
          </ul>
        </>
      )}

      {off.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-2.5 text-xs font-semibold tracking-wider text-muted uppercase">
            Day off
          </h3>
          <ul className="space-y-2">
            {off.map(({ habit, reason }) => (
              <li
                key={habit.id}
                className="flex items-center gap-3 rounded-2xl border border-dashed border-line px-3 py-2.5 text-sm"
              >
                <span className="opacity-60">
                  <HabitIcon habit={habit} size="sm" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-muted">{habit.name}</span>
                  <span className="text-xs text-muted/80">
                    {reason === "weekday"
                      ? `Not scheduled on ${WEEKDAY_LABELS[weekdayIndex(date)]}s`
                      : "Taking the day off"}
                  </span>
                </span>
                {reason === "date" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => run(() => api.removeSkipDate(habit.id, date))}
                  >
                    <Undo2 className="size-3.5" aria-hidden /> Undo
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
