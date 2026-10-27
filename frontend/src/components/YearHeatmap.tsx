"use client";

import { useLayoutEffect, useRef } from "react";

import { cn } from "@/lib/cn";
import { WEEKDAY_LABELS, formatDate, formatLong, parseISODate, weekdayIndex } from "@/lib/dates";
import type { CalendarDay } from "@/lib/types";

const LEVELS = ["bg-brand/20", "bg-brand/45", "bg-brand/70", "bg-brand-gradient"];

function cellClass(day: CalendarDay): string {
  if (day.status === "future" || day.total === 0) return "bg-subtle";
  if (day.completed === 0) return day.status === "pending" ? "bg-line" : "bg-bad/20";
  const ratio = day.completed / day.total;
  return LEVELS[Math.min(LEVELS.length - 1, Math.floor(ratio * LEVELS.length - 0.0001))];
}

/** GitHub-style contribution grid. `days` must start on a Monday. */
export function YearHeatmap({ days }: { days: CalendarDay[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  // On narrow screens the grid scrolls; start at the most recent weeks.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [days]);

  const weeks: CalendarDay[][] = [];
  for (const day of days) {
    if (weekdayIndex(day.date) === 0 || weeks.length === 0) weeks.push([]);
    weeks[weeks.length - 1].push(day);
  }

  return (
    <div>
      <div ref={scrollRef} className="overflow-x-auto pb-2">
        <div className="inline-flex gap-[3px]">
          <div className="mr-1.5 grid grid-rows-[16px_repeat(7,12px)] gap-[3px] text-[10px] leading-3 text-muted">
            <span />
            {WEEKDAY_LABELS.map((label, i) => (
              <span key={label}>{i % 2 === 0 ? label : ""}</span>
            ))}
          </div>
          {weeks.map((week, i) => {
            const firstOfMonth = week.find((d) => parseISODate(d.date).getDate() === 1);
            return (
              <div key={week[0].date} className="grid grid-rows-[16px_repeat(7,12px)] gap-[3px]">
                <span className="text-[10px] leading-3 whitespace-nowrap text-muted">
                  {firstOfMonth || i === 0
                    ? formatDate((firstOfMonth ?? week[0]).date, { month: "short" })
                    : ""}
                </span>
                {week.map((day) => (
                  <span
                    key={day.date}
                    title={`${formatLong(day.date)}: ${day.completed}/${day.total} done`}
                    className={cn("size-3 rounded-[3px]", cellClass(day))}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-xs text-muted">
        <span>Less</span>
        <span className="size-3 rounded-[3px] bg-bad/20" />
        {LEVELS.map((level) => (
          <span key={level} className={cn("size-3 rounded-[3px]", level)} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
