import { Flame } from "lucide-react";

import { ProgressRing } from "@/components/ui";
import { pluralize } from "@/lib/habits";
import type { Summary } from "@/lib/types";

/** The big "Current streak" card on the Today page. */
export function StreakHero({ summary }: { summary: Summary | undefined }) {
  const total = summary?.today_total ?? 0;
  const done = summary?.today_completed ?? 0;
  const streak = summary?.current_streak ?? 0;
  const best = summary?.longest_streak ?? 0;
  const remaining = total - done;

  let message: string;
  if (!summary) message = "Loading your streak…";
  else if (total === 0) message = "Rest day: nothing scheduled, your streak is safe.";
  else if (remaining === 0) message = "Perfect day! Your streak just grew.";
  else if (streak > 0) message = `Finish ${pluralize(remaining, "more habit")} to keep it alive.`;
  else if (best > 0) message = `Start a new streak today. Your best is ${pluralize(best, "day")}.`;
  else message = "Complete every habit today to light your first streak.";

  return (
    <div
      data-tour="streak"
      className="relative flex items-center gap-4 overflow-hidden rounded-2xl bg-brand-gradient p-5 text-white shadow-glow"
    >
      <Flame
        className="pointer-events-none absolute -bottom-10 left-1/2 size-44 text-white/10"
        strokeWidth={1.5}
        aria-hidden
      />
      <div className="relative min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm font-medium text-white/85">
          <Flame className="size-4" aria-hidden /> Current streak
        </p>
        <p className="mt-1 text-4xl font-bold tracking-tight tabular-nums">
          {summary ? streak : "–"}
          <span className="ml-1.5 text-lg font-semibold text-white/80">
            {streak === 1 ? "day" : "days"}
          </span>
        </p>
        <p className="mt-1 text-sm text-pretty text-white/85">{message}</p>
      </div>
      {total > 0 && (
        <div className="relative">
          <ProgressRing value={done / total} size={76} stroke={7} onBrand>
            <span className="text-sm font-bold tabular-nums">
              {done}/{total}
            </span>
          </ProgressRing>
        </div>
      )}
    </div>
  );
}
