"use client";

import { Check, Coffee } from "lucide-react";

import { cn } from "@/lib/cn";
import { WEEKDAY_LABELS, formatLong, parseISODate, weekdayIndex } from "@/lib/dates";
import type { CalendarDay, DayStatus, ISODate } from "@/lib/types";

export const STATUS_STYLES: Record<DayStatus, { cell: string; label: string; swatch: string }> = {
  complete: { cell: "bg-ok text-white shadow-card", label: "All done", swatch: "bg-ok" },
  partial: { cell: "bg-warn/15 text-fg", label: "Partly done", swatch: "bg-warn/60" },
  missed: { cell: "bg-bad/10 text-bad", label: "Missed", swatch: "bg-bad/50" },
  pending: {
    cell: "bg-surface text-fg ring-2 ring-brand ring-inset",
    label: "Today",
    swatch: "ring-2 ring-brand ring-inset",
  },
  future: { cell: "text-muted/40", label: "Upcoming", swatch: "bg-subtle" },
  empty: { cell: "text-muted/60", label: "No habits", swatch: "bg-subtle" },
  rest: { cell: "bg-subtle text-muted", label: "Day off", swatch: "bg-line" },
};

interface Props {
  days: CalendarDay[];
  today: ISODate;
  selected: ISODate | null;
  onSelect: (day: ISODate) => void;
}

export function MonthCalendar({ days, today, selected, onSelect }: Props) {
  if (days.length === 0) return null;
  const leadingBlanks = weekdayIndex(days[0].date);

  return (
    <div>
      <div className="mb-2 grid grid-cols-7 gap-1.5 text-center text-[11px] font-semibold tracking-wide text-muted uppercase sm:gap-2">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label}>{label}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {Array.from({ length: leadingBlanks }, (_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {days.map((day) => {
          const style = STATUS_STYLES[day.status];
          const isFuture = day.date > today;
          const isSelected = day.date === selected;
          const ratio = day.total ? day.completed / day.total : 0;
          return (
            <button
              key={day.date}
              type="button"
              disabled={isFuture}
              onClick={() => onSelect(day.date)}
              title={`${formatLong(day.date)}: ${style.label}${day.total ? ` (${day.completed}/${day.total})` : ""}`}
              className={cn(
                "relative flex aspect-square flex-col items-center justify-center gap-0.5 rounded-xl text-sm font-medium transition",
                style.cell,
                isSelected && "ring-2 ring-fg ring-offset-2 ring-offset-surface",
                isFuture ? "cursor-default" : "hover:scale-[1.04] active:scale-95",
              )}
            >
              <span className={cn(day.date === today && "font-bold")}>
                {parseISODate(day.date).getDate()}
              </span>
              {day.status === "complete" && (
                <Check className="hidden size-3 sm:block" strokeWidth={3} aria-hidden />
              )}
              {day.status === "rest" && <Coffee className="hidden size-3 sm:block" aria-hidden />}
              {(day.status === "partial" || day.status === "pending") && day.total > 0 && (
                <span className="absolute inset-x-2 bottom-1.5 h-1 overflow-hidden rounded-full bg-fg/10 sm:inset-x-3">
                  <span
                    className="block h-full rounded-full bg-warn"
                    style={{ width: `${ratio * 100}%` }}
                  />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function StatusLegend({ statuses }: { statuses: DayStatus[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted">
      {statuses.map((status) => (
        <li key={status} className="flex items-center gap-1.5">
          <span className={cn("inline-block size-3 rounded", STATUS_STYLES[status].swatch)} />
          {STATUS_STYLES[status].label}
        </li>
      ))}
    </ul>
  );
}
