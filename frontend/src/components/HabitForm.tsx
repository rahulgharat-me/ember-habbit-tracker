"use client";

import { CalendarPlus, Check, LoaderCircle, Pipette, X } from "lucide-react";
import { type FormEvent, type ReactNode, useState } from "react";

import { EmojiPicker } from "@/components/EmojiPicker";
import { Button } from "@/components/ui";
import { errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { WEEKDAY_LABELS, formatDate } from "@/lib/dates";
import {
  HABIT_COLORS,
  HABIT_ICONS,
  type HabitTemplate,
  SCHEDULE_PRESETS,
  scheduleLabel,
} from "@/lib/habits";
import type { HabitInput, ISODate } from "@/lib/types";

interface Props {
  initial?: HabitInput;
  defaultStartDate: ISODate;
  submitLabel: string;
  onSubmit: (input: HabitInput) => Promise<void>;
  onCancel?: () => void;
  /** Fills name, description, icon and color whenever a new template object is passed. */
  template?: HabitTemplate | null;
}

export const inputClass =
  "h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-base outline-none transition placeholder:text-muted/70 focus:border-brand focus:ring-4 focus:ring-brand/15 sm:text-sm";

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium">
        {label} {hint && <span className="font-normal text-muted">{hint}</span>}
      </p>
      {children}
    </div>
  );
}

export function HabitForm({
  initial,
  defaultStartDate,
  submitLabel,
  onSubmit,
  onCancel,
  template = null,
}: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? HABIT_ICONS[0]);
  const [color, setColor] = useState(initial?.color ?? HABIT_COLORS[0]);
  const [startDate, setStartDate] = useState(initial?.start_date ?? defaultStartDate);
  const [skipWeekdays, setSkipWeekdays] = useState<number[]>(initial?.skip_weekdays ?? []);
  const [skipDates, setSkipDates] = useState<ISODate[]>(initial?.skip_dates ?? []);
  const [newSkipDate, setNewSkipDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [appliedTemplate, setAppliedTemplate] = useState(template);

  // Adjust state during render (not in an effect) so a picked template shows up immediately;
  // schedule and days off are left as the user set them.
  if (template !== appliedTemplate) {
    setAppliedTemplate(template);
    if (template) {
      setName(template.name);
      setDescription(template.description);
      setIcon(template.icon);
      setColor(template.color);
      setError(null);
    }
  }

  const isCustomColor = !HABIT_COLORS.includes(color.toLowerCase());

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Give your habit a name");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || null,
        icon,
        color,
        start_date: startDate,
        skip_weekdays: skipWeekdays,
        skip_dates: skipDates,
      });
      if (!initial) {
        setName("");
        setDescription("");
        setSkipWeekdays([]);
        setSkipDates([]);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function toggleWeekday(day: number) {
    const next = skipWeekdays.includes(day)
      ? skipWeekdays.filter((d) => d !== day)
      : [...skipWeekdays, day].sort();
    if (next.length < 7) setSkipWeekdays(next); // at least one day must stay scheduled
  }

  function addSkipDate() {
    if (newSkipDate && !skipDates.includes(newSkipDate)) {
      setSkipDates([...skipDates, newSkipDate].sort());
    }
    setNewSkipDate("");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Live preview */}
      <div
        className="flex items-center gap-3 rounded-2xl border border-line p-3"
        style={{ backgroundColor: `color-mix(in oklab, ${color} 7%, var(--color-surface))` }}
      >
        <span
          className="grid size-12 shrink-0 place-items-center rounded-xl text-2xl"
          style={{ backgroundColor: `color-mix(in oklab, ${color} 18%, transparent)` }}
          aria-hidden
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className={cn("truncate font-medium", !name && "text-muted")}>
            {name || "Your new habit"}
          </p>
          <p className="truncate text-xs text-muted">{scheduleLabel(skipWeekdays)}</p>
        </div>
      </div>

      <Field label="Name">
        <input
          className={inputClass}
          value={name}
          maxLength={100}
          placeholder="e.g. Read 20 pages"
          onChange={(e) => setName(e.target.value)}
          autoFocus={!initial}
        />
      </Field>

      <Field label="Description" hint="(optional)">
        <input
          className={inputClass}
          value={description}
          maxLength={500}
          placeholder="Why does this habit matter to you?"
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>

      <Field label="Icon">
        <div className="relative grid grid-cols-10 gap-1.5">
          {HABIT_ICONS.map((option) => (
            <button
              key={option}
              type="button"
              aria-label={`Icon ${option}`}
              aria-pressed={icon === option}
              onClick={() => setIcon(option)}
              className={cn(
                "grid aspect-square place-items-center rounded-xl border text-lg transition sm:text-xl",
                icon === option
                  ? "border-brand bg-brand/10 ring-2 ring-brand/20"
                  : "border-transparent bg-subtle hover:border-line",
              )}
            >
              {option}
            </button>
          ))}
          <EmojiPicker value={icon} isCustom={!HABIT_ICONS.includes(icon)} onChange={setIcon} />
        </div>
      </Field>

      <Field label="Color">
        <div className="grid grid-cols-10 gap-2">
          {HABIT_COLORS.map((option) => (
            <button
              key={option}
              type="button"
              aria-label={`Color ${option}`}
              aria-pressed={color.toLowerCase() === option}
              onClick={() => setColor(option)}
              className="grid aspect-square place-items-center rounded-full transition hover:scale-110"
              style={{ backgroundColor: option }}
            >
              {color.toLowerCase() === option && (
                <Check className="size-4 text-white" strokeWidth={3} />
              )}
            </button>
          ))}
          {/* The invisible native input covers the swatch, so a click opens the OS color picker. */}
          <label
            title="Custom color"
            className={cn(
              "relative grid aspect-square cursor-pointer place-items-center rounded-full transition hover:scale-110",
              isCustomColor && "ring-2 ring-fg/20 ring-offset-2 ring-offset-surface",
            )}
            style={{
              background: isCustomColor
                ? color
                : "conic-gradient(#ef4444, #eab308, #22c55e, #06b6d4, #3b82f6, #d946ef, #ef4444)",
            }}
          >
            <input
              type="color"
              aria-label="Custom color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="absolute inset-0 size-full cursor-pointer opacity-0"
            />
            {isCustomColor ? (
              <Check className="size-4 text-white" strokeWidth={3} aria-hidden />
            ) : (
              <Pipette className="size-3.5 text-white drop-shadow" aria-hidden />
            )}
          </label>
        </div>
      </Field>

      <Field label="Start date">
        <input
          type="date"
          className={inputClass}
          value={startDate}
          max={defaultStartDate}
          onChange={(e) => setStartDate(e.target.value)}
          required
        />
      </Field>

      <Field label="Repeat on">
        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAY_LABELS.map((label, day) => {
            const scheduled = !skipWeekdays.includes(day);
            return (
              <button
                key={label}
                type="button"
                aria-pressed={scheduled}
                onClick={() => toggleWeekday(day)}
                className={cn(
                  "h-10 rounded-xl text-xs font-semibold transition sm:text-sm",
                  scheduled
                    ? "bg-fg text-bg shadow-card"
                    : "bg-subtle text-muted line-through hover:text-fg",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex gap-1.5">
          {SCHEDULE_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => setSkipWeekdays(preset.skipWeekdays)}
              className="rounded-full border border-line px-2.5 py-1 text-xs font-medium text-muted transition hover:border-brand hover:text-brand"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Days off" hint="(holidays, sick days…)">
        <div className="flex gap-2">
          <input
            type="date"
            aria-label="Day off"
            className={inputClass}
            value={newSkipDate}
            min={startDate}
            onChange={(e) => setNewSkipDate(e.target.value)}
          />
          <Button
            variant="secondary"
            size="md"
            className="h-11"
            onClick={addSkipDate}
            disabled={!newSkipDate}
          >
            <CalendarPlus className="size-4" aria-hidden /> Add
          </Button>
        </div>
        {skipDates.length > 0 && (
          <ul className="mt-2.5 flex flex-wrap gap-1.5">
            {skipDates.map((day) => (
              <li
                key={day}
                className="flex items-center gap-1 rounded-full bg-subtle py-1 pr-1 pl-3 text-xs font-medium"
              >
                {formatDate(day, { month: "short", day: "numeric", year: "numeric" })}
                <button
                  type="button"
                  aria-label={`Remove day off ${day}`}
                  onClick={() => setSkipDates(skipDates.filter((d) => d !== day))}
                  className="grid size-5 place-items-center rounded-full text-muted hover:bg-line hover:text-fg"
                >
                  <X className="size-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Field>

      {error && <p className="text-sm font-medium text-bad">{error}</p>}

      <div className="flex gap-2 pt-1">
        <Button type="submit" variant="brand" disabled={saving} className="flex-1 sm:flex-none">
          {saving && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
          {saving ? "Saving…" : submitLabel}
        </Button>
        {onCancel && (
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
