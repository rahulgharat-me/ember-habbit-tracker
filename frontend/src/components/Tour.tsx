"use client";

import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { type CSSProperties, useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui";
import { APP_NAME } from "@/lib/brand";
import { cn } from "@/lib/cn";

export interface TourStep {
  /** `data-tour` value of the element to spotlight. Omit for a centered card. */
  target?: string;
  title: string;
  body: string;
}

/** The first-run walkthrough of the Today page. Targets are tagged with `data-tour`. */
export const WELCOME_TOUR: TourStep[] = [
  {
    title: "You're all set 🎉",
    body: `Here's a quick tour of how ${APP_NAME} works. It takes about 30 seconds, and you can replay it any time from your account menu.`,
  },
  {
    target: "streak",
    title: "Your streak",
    body: "A perfect day is one where every habit is done. Perfect days in a row make your streak. Today counts as in progress until midnight, so there's still time.",
  },
  {
    target: "mark",
    title: "Check in",
    body: "Tap ✓ when you've done a habit and ✕ if you missed it. Tap again to clear the mark.",
  },
  {
    target: "day-off",
    title: "Need a break?",
    body: "Sick or traveling? Take a day off for a habit. It won't break your streak or extend it, and you can undo it.",
  },
  {
    target: "date",
    title: "Catch up on past days",
    body: "Forgot to check in yesterday? Step back a day, or tap the date to jump further, and fill it in.",
  },
  {
    target: "nav",
    title: "Find your way around",
    body: "Calendar shows each month at a glance. Insights shows your trends. Habits is where you add and edit habits, and choose which weekdays they repeat on.",
  },
  {
    target: "account",
    title: "Make it yours",
    body: "Switch between light and dark themes, replay this tour, or sign out here.",
  },
  {
    title: "Light your first streak 🔥",
    body: "Finish every habit today to start your streak. See you tomorrow!",
  },
];

/** Space between the highlighted element and the spotlight's edge. */
const PAD = 6;
/** Space between the spotlight and the card. */
const GAP = 12;
const GUTTER = 16;
const CARD_WIDTH = 352;

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** The first visible element with this `data-tour` name (e.g. desktop vs. mobile nav). */
function findTarget(name: string): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`)) {
    const { width, height } = el.getBoundingClientRect();
    if (width > 0 && height > 0) return el;
  }
  return null;
}

/**
 * Tracks the target's position every frame, so the spotlight follows scrolling, resizing and
 * content that loads late. `null` until the target exists.
 */
function useTargetRect(target: string | undefined, reduceMotion: boolean): Rect | null {
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    if (!target) {
      setRect(null);
      return;
    }
    let frame = 0;
    let scrolled = false;
    const tick = () => {
      const el = findTarget(target);
      if (el && !scrolled) {
        el.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
        scrolled = true;
      }
      const r = el?.getBoundingClientRect();
      setRect((prev) => {
        if (!r) return null;
        if (
          prev &&
          prev.top === r.top &&
          prev.left === r.left &&
          prev.width === r.width &&
          prev.height === r.height
        ) {
          return prev;
        }
        return { top: r.top, left: r.left, width: r.width, height: r.height };
      });
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [target, reduceMotion]);

  return rect;
}

/** Puts the card below the spotlight, or above it when there's more room there. */
function cardPosition(rect: Rect): CSSProperties {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(CARD_WIDTH, vw - GUTTER * 2);
  const centered = rect.left + rect.width / 2 - width / 2;
  const left = Math.min(Math.max(centered, GUTTER), vw - width - GUTTER);
  const below = rect.top + rect.height + PAD;
  const above = rect.top - PAD;
  return vh - below >= above
    ? { top: below + GAP, left, width }
    : { bottom: vh - above + GAP, left, width };
}

/**
 * Spotlight walkthrough: dims the page, highlights one element per step and explains it in a
 * card. Steps whose target isn't on screen fall back to a centered card.
 */
export function Tour({ steps, onClose }: { steps: TourStep[]; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const reduceMotion = useReducedMotion() ?? false;
  const step = steps[index];
  const rect = useTargetRect(step.target, reduceMotion);
  const isLast = index === steps.length - 1;
  const titleId = useId();
  const nextRef = useRef<HTMLButtonElement>(null);

  function next() {
    if (isLast) onClose();
    else setIndex((i) => i + 1);
  }

  function back() {
    setIndex((i) => Math.max(i - 1, 0));
  }

  // Toasts (e.g. "Added ..." from onboarding) sit above everything and would cover the tour.
  useEffect(() => {
    toast.dismiss();
  }, []);

  useEffect(() => {
    nextRef.current?.focus({ preventScroll: true });
  }, [index]);

  // `next`/`back` change every render; re-subscribing is cheap.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowRight") next();
      else if (event.key === "ArrowLeft") back();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const spring = reduceMotion
    ? { duration: 0 }
    : ({ type: "spring", stiffness: 420, damping: 38 } as const);

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      {rect ? (
        <motion.div
          className="pointer-events-none absolute rounded-2xl ring-2 ring-brand/80"
          style={{ boxShadow: "0 0 0 9999px rgb(12 10 9 / 0.62)" }}
          initial={false}
          animate={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
          }}
          transition={spring}
        />
      ) : (
        <div className="absolute inset-0 bg-[rgb(12_10_9/0.62)]" />
      )}

      <div
        className={cn(
          "pointer-events-none absolute inset-0",
          !rect && "grid place-items-center px-4",
        )}
      >
        <motion.div
          key={index}
          initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.25, delay: rect && !reduceMotion ? 0.1 : 0 }}
          className={cn(
            "pointer-events-auto rounded-2xl border border-line bg-surface p-5 shadow-lift",
            rect ? "absolute" : "w-full max-w-sm",
          )}
          style={rect ? cardPosition(rect) : undefined}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-muted tabular-nums">
              {index + 1} of {steps.length}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Skip tour"
              title="Skip tour"
              className="-m-1.5 grid size-8 place-items-center rounded-lg text-muted transition hover:bg-subtle hover:text-fg"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
          <h2 id={titleId} className="mt-1 text-lg font-semibold tracking-tight">
            {step.title}
          </h2>
          <p className="mt-1.5 text-sm text-pretty text-muted">{step.body}</p>

          <div className="mt-5 flex items-center justify-between gap-3">
            <div className="flex gap-1.5" aria-hidden>
              {steps.map((s, i) => (
                <span
                  key={s.title}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === index ? "w-5 bg-brand" : "w-1.5 bg-line",
                  )}
                />
              ))}
            </div>
            <div className="flex gap-2">
              {index > 0 && (
                <Button variant="ghost" size="sm" onClick={back}>
                  <ArrowLeft className="size-4" aria-hidden /> Back
                </Button>
              )}
              <Button ref={nextRef} variant="brand" size="sm" onClick={next}>
                {index === 0 ? "Show me" : isLast ? "Start tracking" : "Next"}
                {!isLast && <ArrowRight className="size-4" aria-hidden />}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
