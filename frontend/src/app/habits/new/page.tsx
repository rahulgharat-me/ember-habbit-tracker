"use client";

import { ArrowLeft, Check, Plus, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { HabitForm } from "@/components/HabitForm";
import { ButtonLink, Card, CardTitle, PageHeader, Skeleton } from "@/components/ui";
import { useAsync } from "@/hooks/useAsync";
import { useToday } from "@/hooks/useToday";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { HABIT_TEMPLATES, type HabitTemplate } from "@/lib/habits";

export default function NewHabitPage() {
  const router = useRouter();
  const today = useToday();
  const habits = useAsync(() => api.listHabits(true), []);
  const [template, setTemplate] = useState<HabitTemplate | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Templates the user already has are hidden, matched by name.
  const taken = new Set(habits.data?.map((h) => h.name.toLowerCase()));
  const templates = HABIT_TEMPLATES.filter((t) => !taken.has(t.name.toLowerCase()));

  function pick(next: HabitTemplate) {
    // A fresh object each time, so picking the same tile again re-fills the form.
    setTemplate({ ...next });
    // On phones the form sits below the tiles; desktop keeps it in view (sticky).
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  if (!today) return <Skeleton className="h-96" />;

  return (
    <>
      <PageHeader
        title="New habit"
        subtitle="Start with something small enough to do on your worst day."
        actions={
          <ButtonLink href="/habits" variant="secondary" size="sm">
            <ArrowLeft className="size-4" aria-hidden /> All habits
          </ButtonLink>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_440px]">
        <section>
          <h2 className="flex items-center gap-2 font-semibold">
            <Sparkles className="size-4 text-brand" aria-hidden /> Quick start
          </h2>
          <p className="mb-3 text-sm text-muted">
            Pick one to fill in the form, then tweak anything you like.
          </p>
          {!habits.data ? (
            <div className="grid gap-2.5 sm:grid-cols-2">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-[4.25rem]" />
              ))}
            </div>
          ) : templates.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">
              You&apos;ve added every quick-start habit. Create your own with the form.
            </p>
          ) : (
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {templates.map((t, i) => {
                const selected = template?.name === t.name;
                return (
                  <motion.li
                    key={t.name}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.03 * i }}
                  >
                    <button
                      type="button"
                      aria-pressed={selected}
                      onClick={() => pick(t)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-2xl border bg-surface p-3 text-left shadow-card transition",
                        selected
                          ? "border-brand ring-2 ring-brand/20"
                          : "border-line hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lift",
                      )}
                    >
                      <span
                        className="grid size-11 shrink-0 place-items-center rounded-xl text-2xl"
                        style={{
                          backgroundColor: `color-mix(in oklab, ${t.color} 16%, transparent)`,
                        }}
                        aria-hidden
                      >
                        {t.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{t.name}</span>
                        <span className="block truncate text-xs text-muted">{t.description}</span>
                      </span>
                      <span
                        className={cn(
                          "grid size-8 shrink-0 place-items-center rounded-full",
                          selected ? "bg-brand text-white" : "bg-subtle text-muted",
                        )}
                      >
                        {selected ? (
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
          )}
        </section>

        <div ref={formRef} className="scroll-mt-24">
          <Card className="h-fit lg:sticky lg:top-24">
            <CardTitle icon={Plus}>Habit details</CardTitle>
            <HabitForm
              defaultStartDate={today}
              submitLabel="Add habit"
              template={template}
              onCancel={() => router.push("/habits")}
              onSubmit={async (input) => {
                await api.createHabit(input);
                toast.success(`Added "${input.name}"`);
                router.push("/habits");
              }}
            />
          </Card>
        </div>
      </div>
    </>
  );
}
