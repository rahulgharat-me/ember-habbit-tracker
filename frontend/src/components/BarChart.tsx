import { cn } from "@/lib/cn";
import { formatPercent } from "@/lib/habits";

export interface Bar {
  key: string;
  label: string;
  /** 0..1 */
  value: number;
  tooltip?: string;
}

/** Vertical percentage bars; the best bar is highlighted. */
export function BarChart({ bars, height = 168 }: { bars: Bar[]; height?: number }) {
  const best = Math.max(0, ...bars.map((b) => b.value));
  const dense = bars.length > 7;

  return (
    <div className={cn("flex items-end", dense ? "gap-1 sm:gap-2" : "gap-2")} style={{ height }}>
      {bars.map((bar, i) => {
        const isBest = bar.value === best && best > 0;
        return (
          <div
            key={bar.key}
            className="group flex h-full min-w-0 flex-1 flex-col items-center gap-1.5"
            title={bar.tooltip}
          >
            <span
              className={cn(
                "text-[11px] font-medium tabular-nums",
                isBest ? "text-brand" : "text-muted",
                dense && "hidden sm:block",
              )}
            >
              {formatPercent(bar.value)}
            </span>
            <div className="flex w-full flex-1 items-end overflow-hidden rounded-lg bg-subtle">
              <div
                className={cn(
                  "w-full rounded-lg transition-[height] duration-700 ease-out group-hover:brightness-110",
                  isBest ? "bg-brand-gradient" : "bg-brand/35",
                )}
                style={{ height: `${Math.max(bar.value * 100, bar.value > 0 ? 3 : 0)}%` }}
              />
            </div>
            <span
              className={cn(
                "text-[10px] whitespace-nowrap text-muted sm:text-[11px]",
                dense && i % 2 === 1 && "invisible",
              )}
            >
              {bar.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
