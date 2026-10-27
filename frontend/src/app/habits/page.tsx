"use client";

import type { LucideIcon } from "lucide-react";
import {
  Archive,
  ArchiveRestore,
  CalendarOff,
  Flame,
  ListChecks,
  Pencil,
  Plus,
  Repeat,
  Trash2,
  Trophy,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useMemo, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { HabitIcon } from "@/components/HabitCheckRow";
import { HabitForm } from "@/components/HabitForm";
import {
  Button,
  ButtonLink,
  Card,
  CardTitle,
  EmptyState,
  ErrorBanner,
  PageHeader,
  Skeleton,
} from "@/components/ui";
import { useAsync } from "@/hooks/useAsync";
import { useToday } from "@/hooks/useToday";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatShort } from "@/lib/dates";
import { formatPercent, pluralize, scheduleLabel, statsById } from "@/lib/habits";
import type { Habit, HabitStats, HabitUpdate } from "@/lib/types";

export default function HabitsPage() {
  const today = useToday();
  const habits = useAsync(() => api.listHabits(true), []);
  const summary = useAsync(() => api.getSummary(today!), [today], today !== null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<Habit | null>(null);

  const stats = useMemo(() => statsById(summary.data?.habits), [summary.data]);
  const active = habits.data?.filter((h) => !h.is_archived) ?? [];
  const archived = habits.data?.filter((h) => h.is_archived) ?? [];

  function refresh() {
    habits.reload();
    summary.reload();
  }

  async function run(action: () => Promise<unknown>, success: string) {
    try {
      await action();
      toast.success(success);
      refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  const update = (habit: Habit, input: HabitUpdate, success: string) =>
    run(() => api.updateHabit(habit.id, input), success);

  if (!today) return <Skeleton className="h-96" />;

  return (
    <>
      <PageHeader
        title="Habits"
        subtitle="Shape the routine you want to build."
        actions={
          <div className="flex items-center gap-2">
            {active.length > 0 && (
              <span className="rounded-full bg-subtle px-3 py-1 text-sm font-medium text-muted">
                {pluralize(active.length, "active habit")}
              </span>
            )}
            <ButtonLink href="/habits/new" variant="brand" size="sm">
              <Plus className="size-4" aria-hidden /> New habit
            </ButtonLink>
          </div>
        }
      />

      {habits.error && <ErrorBanner message={habits.error} onRetry={habits.reload} />}

      <div className="space-y-6">
        {!habits.data ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        ) : active.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="No habits yet"
            action={
              <ButtonLink href="/habits/new" variant="brand">
                <Plus className="size-4" aria-hidden /> Add a habit
              </ButtonLink>
            }
          >
            Start with something small enough to do on your worst day.
          </EmptyState>
        ) : (
          <ul className="space-y-3">
            <AnimatePresence initial={false}>
              {active.map((habit) =>
                editingId === habit.id ? (
                  <motion.li key={habit.id} layout>
                    <Card>
                      <CardTitle icon={Pencil}>Edit habit</CardTitle>
                      <HabitForm
                        initial={habit}
                        defaultStartDate={today}
                        submitLabel="Save changes"
                        onCancel={() => setEditingId(null)}
                        onSubmit={async (input) => {
                          await api.updateHabit(habit.id, input);
                          setEditingId(null);
                          toast.success("Changes saved");
                          refresh();
                        }}
                      />
                    </Card>
                  </motion.li>
                ) : (
                  <HabitRow key={habit.id} habit={habit} stats={stats.get(habit.id)}>
                    <IconAction icon={Pencil} label="Edit" onClick={() => setEditingId(habit.id)} />
                    <IconAction
                      icon={Archive}
                      label="Archive"
                      onClick={() => update(habit, { archived: true }, `Archived "${habit.name}"`)}
                    />
                    <IconAction
                      icon={Trash2}
                      label="Delete"
                      danger
                      onClick={() => setDeleting(habit)}
                    />
                  </HabitRow>
                ),
              )}
            </AnimatePresence>
          </ul>
        )}

        {archived.length > 0 && (
          <section>
            <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-muted">
              <Archive className="size-4" aria-hidden /> Archived ({archived.length})
            </h2>
            <p className="mb-3 text-xs text-muted">
              History is kept, but these no longer count towards your streak.
            </p>
            <ul className="space-y-3">
              {archived.map((habit) => (
                <HabitRow key={habit.id} habit={habit} stats={stats.get(habit.id)} muted>
                  <IconAction
                    icon={ArchiveRestore}
                    label="Restore"
                    onClick={() => update(habit, { archived: false }, `Restored "${habit.name}"`)}
                  />
                  <IconAction
                    icon={Trash2}
                    label="Delete"
                    danger
                    onClick={() => setDeleting(habit)}
                  />
                </HabitRow>
              ))}
            </ul>
          </section>
        )}
      </div>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete "${deleting?.name}"?`}
        description="This permanently removes the habit and its entire history. To keep the history, archive it instead."
        confirmLabel="Delete habit"
        onConfirm={() => {
          if (deleting) void run(() => api.deleteHabit(deleting.id), `Deleted "${deleting.name}"`);
          setDeleting(null);
        }}
      />
    </>
  );
}

function HabitRow({
  habit,
  stats,
  muted,
  children,
}: {
  habit: Habit;
  stats?: HabitStats;
  muted?: boolean;
  children: ReactNode;
}) {
  const rate = stats?.completion_rate_30d ?? 0;
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className={cn(
        "rounded-2xl border border-line bg-surface p-4 shadow-card",
        muted && "bg-surface/60 opacity-75",
      )}
    >
      <div className="flex items-start gap-3">
        <HabitIcon habit={habit} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold break-words">{habit.name}</p>
          {habit.description && <p className="truncate text-sm text-muted">{habit.description}</p>}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Chip icon={Repeat}>{scheduleLabel(habit.skip_weekdays)}</Chip>
            {habit.skip_dates.length > 0 && (
              <Chip icon={CalendarOff}>{pluralize(habit.skip_dates.length, "day")} off</Chip>
            )}
            <Chip>
              {habit.archived_on
                ? `Archived ${formatShort(habit.archived_on)}`
                : `Since ${formatShort(habit.start_date)}`}
            </Chip>
          </div>
        </div>
        <div className="flex shrink-0 gap-0.5">{children}</div>
      </div>

      {stats && (
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3 text-center sm:text-left">
          <Metric icon={Flame} label="Streak" value={stats.current_streak} tone="text-brand" />
          <Metric icon={Trophy} label="Best" value={stats.longest_streak} tone="text-warn" />
          <div>
            <p className="text-xs text-muted">Last 30 days</p>
            <div className="mt-1 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-subtle">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${rate * 100}%`, backgroundColor: habit.color }}
                />
              </div>
              <span className="text-sm font-semibold tabular-nums">{formatPercent(rate)}</span>
            </div>
          </div>
        </div>
      )}
    </motion.li>
  );
}

function Chip({ icon: Icon, children }: { icon?: LucideIcon; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-subtle px-2 py-0.5 text-xs text-muted">
      {Icon && <Icon className="size-3" aria-hidden />}
      {children}
    </span>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 inline-flex items-center gap-1 text-sm font-semibold tabular-nums">
        <Icon className={cn("size-3.5", tone)} aria-hidden />
        {value} {value === 1 ? "day" : "days"}
      </p>
    </div>
  );
}

function IconAction({
  icon: Icon,
  label,
  danger,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("size-9", danger && "hover:bg-bad/10 hover:text-bad")}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <Icon className="size-4" />
    </Button>
  );
}
