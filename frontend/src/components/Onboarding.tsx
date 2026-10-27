"use client";

import { ArrowRight, Check, LoaderCircle, Plus, Sprout } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";

import { Button, ButtonLink, Illustration } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { APP_NAME } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { HABIT_TEMPLATES, type HabitTemplate } from "@/lib/habits";
import type { ISODate } from "@/lib/types";

const STEPS = [
  { title: "Pick a few habits", body: "Start small: two or three is plenty." },
  { title: "Check in every day", body: "Tap ✓ when done, ✕ when you miss." },
  { title: "Grow your streak", body: "Complete them all to keep the flame alive." },
];

/**
 * First-run screen: explains the idea and offers one-tap starter habits. It stays up while the
 * user adds several, until they press "Start tracking" (`onFinish`).
 */
export function Onboarding({
  today,
  onCreated,
  onFinish,
}: {
  today: ISODate;
  onCreated: () => void;
  onFinish: () => void;
}) {
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<string | null>(null);

  async function add(template: HabitTemplate) {
    setPending(template.name);
    try {
      await api.createHabit({ ...template, start_date: today });
      setAdded((prev) => new Set(prev).add(template.name));
      toast.success(`Added "${template.name}"`);
      onCreated();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="animate-fade-up">
      <section className="relative overflow-hidden rounded-3xl border border-line bg-surface px-6 py-10 text-center shadow-card sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-brand/10 blur-3xl" />
        <Illustration icon={Sprout} />
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          Welcome to <span className="text-brand-gradient">{APP_NAME}</span>
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-pretty text-muted sm:text-base">
          Small habits, done daily, become who you are. Let&apos;s light your first streak.
        </p>

        <ol className="mx-auto mt-8 grid max-w-2xl gap-3 text-left sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="rounded-2xl bg-subtle p-4">
              <span className="grid size-7 place-items-center rounded-full bg-brand-gradient text-xs font-bold text-white">
                {i + 1}
              </span>
              <p className="mt-2.5 text-sm font-semibold">{step.title}</p>
              <p className="mt-0.5 text-xs text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="font-semibold">Quick start</h2>
            <p className="text-sm text-muted">Tap to add a popular habit. You can edit it later.</p>
          </div>
          <ButtonLink href="/habits/new" variant="secondary" size="sm">
            <Plus className="size-4" aria-hidden /> Custom
          </ButtonLink>
        </div>
        <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {HABIT_TEMPLATES.map((template, i) => {
            const isAdded = added.has(template.name);
            const isPending = pending === template.name;
            return (
              <motion.li
                key={template.name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
              >
                <button
                  type="button"
                  disabled={isAdded || pending !== null}
                  onClick={() => add(template)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl border bg-surface p-3 text-left shadow-card transition",
                    isAdded
                      ? "border-ok/40"
                      : "border-line hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lift",
                    pending !== null && !isPending && !isAdded && "opacity-60",
                  )}
                >
                  <span
                    className="grid size-11 shrink-0 place-items-center rounded-xl text-2xl"
                    style={{
                      backgroundColor: `color-mix(in oklab, ${template.color} 16%, transparent)`,
                    }}
                    aria-hidden
                  >
                    {template.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{template.name}</span>
                    <span className="block truncate text-xs text-muted">
                      {template.description}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-full",
                      isAdded ? "bg-ok text-white" : "bg-subtle text-muted",
                    )}
                  >
                    {isPending ? (
                      <LoaderCircle className="size-4 animate-spin" aria-hidden />
                    ) : isAdded ? (
                      <Check className="size-4" strokeWidth={3} aria-hidden />
                    ) : (
                      <Plus className="size-4" aria-hidden />
                    )}
                  </span>
                </button>
              </motion.li>
            );
          })}
        </ul>
      </section>

      {added.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-20 mt-6 flex justify-center sm:bottom-6"
        >
          <Button variant="brand" size="lg" onClick={onFinish}>
            Start tracking {added.size} habit{added.size === 1 ? "" : "s"}
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        </motion.div>
      )}
    </div>
  );
}
