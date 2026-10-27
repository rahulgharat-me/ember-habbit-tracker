"use client";

import { CalendarOff, Check, Flame, X } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";
import type { Habit } from "@/lib/types";

/** `true` = done, `false` = missed, `undefined` = not marked yet. */
export type Mark = boolean | undefined;

interface Props {
  habit: Habit;
  mark: Mark;
  streak?: number;
  disabled?: boolean;
  /** `null` clears the mark. */
  onMark: (next: boolean | null) => void;
  /** Makes this day a day off for the habit. */
  onSkip?: () => void;
}

export function HabitCheckRow({ habit, mark, streak, disabled, onMark, onSkip }: Props) {
  const done = mark === true;
  const missed = mark === false;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "group flex items-center gap-3 rounded-2xl border bg-surface p-3 shadow-card transition-colors sm:gap-4 sm:p-4",
        done ? "border-transparent" : "border-line",
      )}
      style={
        done
          ? { backgroundColor: `color-mix(in oklab, ${habit.color} 9%, var(--color-surface))` }
          : undefined
      }
    >
      <HabitIcon habit={habit} />

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "font-medium break-words transition-colors",
            done && "text-muted line-through decoration-2",
            missed && "text-muted",
          )}
          style={done ? { textDecorationColor: habit.color } : undefined}
        >
          {habit.name}
        </p>
        {habit.description && <p className="truncate text-sm text-muted">{habit.description}</p>}
        {((streak !== undefined && streak > 0) || onSkip) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            {streak !== undefined && streak > 0 && (
              <span
                className="inline-flex items-center gap-1 font-medium text-brand"
                title="Habit streak"
              >
                <Flame className="size-3.5" aria-hidden />
                {streak} day{streak === 1 ? "" : "s"}
              </span>
            )}
            {onSkip && (
              <button
                type="button"
                data-tour="day-off"
                title="Take this day off (won't affect your streak)"
                aria-label={`Take a day off from ${habit.name}`}
                disabled={disabled}
                onClick={onSkip}
                className="-mx-1.5 -my-1 inline-flex items-center gap-1 rounded-md px-1.5 py-1 font-medium transition hover:bg-subtle hover:text-fg disabled:opacity-50"
              >
                <CalendarOff className="size-3.5" aria-hidden />
                Day off
              </button>
            )}
          </div>
        )}
      </div>

      <div data-tour="mark" className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <MarkButton
          label={`Mark ${habit.name} as missed`}
          active={missed}
          disabled={disabled}
          onClick={() => onMark(missed ? null : false)}
          className={cn(
            "size-9 sm:size-10",
            missed
              ? "border-bad bg-bad text-white"
              : "border-line text-muted hover:border-bad/60 hover:text-bad",
          )}
        >
          <X className="size-4" strokeWidth={2.5} />
        </MarkButton>
        <MarkButton
          label={`Mark ${habit.name} as done`}
          active={done}
          disabled={disabled}
          onClick={() => onMark(done ? null : true)}
          className={cn(
            "size-11 sm:size-12",
            done ? "border-transparent text-white" : "border-line text-muted hover:text-fg",
          )}
          style={
            done
              ? { backgroundColor: habit.color, boxShadow: `0 6px 18px -6px ${habit.color}` }
              : undefined
          }
        >
          <Check className={cn("size-5", done && "animate-pop")} strokeWidth={3} />
        </MarkButton>
      </div>
    </motion.li>
  );
}

export function HabitIcon({ habit, size = "md" }: { habit: Habit; size?: "sm" | "md" }) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-xl",
        size === "md" ? "size-11 text-2xl sm:size-12" : "size-9 text-lg",
      )}
      style={{ backgroundColor: `color-mix(in oklab, ${habit.color} 16%, transparent)` }}
      aria-hidden
    >
      {habit.icon}
    </span>
  );
}

function MarkButton({
  label,
  active,
  disabled,
  onClick,
  className,
  style,
  children,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  className: string;
  style?: React.CSSProperties;
  children: ReactNode;
}) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={active ? "Tap again to clear" : label}
      disabled={disabled}
      onClick={onClick}
      whileTap={{ scale: 0.88 }}
      className={cn(
        "grid place-items-center rounded-full border-2 transition-colors disabled:opacity-50",
        "focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:outline-none",
        className,
      )}
      style={style}
    >
      {children}
    </motion.button>
  );
}
