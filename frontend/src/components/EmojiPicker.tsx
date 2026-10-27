"use client";

import { Check, SmilePlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";

const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  {
    label: "Health & fitness",
    emojis: [
      "🏃",
      "🚶",
      "🚴",
      "🏊",
      "🧘",
      "🤸",
      "🏋️",
      "⚽",
      "🏀",
      "🎾",
      "🥾",
      "🧗",
      "🛌",
      "😴",
      "💊",
      "🩺",
      "🦷",
      "🧴",
      "🚿",
      "❤️",
    ],
  },
  {
    label: "Food & drink",
    emojis: [
      "💧",
      "🥗",
      "🍎",
      "🥦",
      "🥕",
      "🍌",
      "🫐",
      "🥑",
      "🍳",
      "🥛",
      "🍵",
      "☕",
      "🥤",
      "🍬",
      "🍷",
      "🚭",
    ],
  },
  {
    label: "Mind & growth",
    emojis: [
      "🧠",
      "📚",
      "📖",
      "✍️",
      "📝",
      "🎓",
      "🗣️",
      "🧩",
      "♟️",
      "🔬",
      "💡",
      "🎯",
      "🙏",
      "😊",
      "🌈",
      "🕯️",
    ],
  },
  {
    label: "Creative",
    emojis: ["🎨", "🎸", "🎹", "🎻", "🥁", "🎤", "🎧", "📷", "🎬", "🧶", "🪡", "✂️"],
  },
  {
    label: "Home & money",
    emojis: ["🧹", "🧺", "🛏️", "🍽️", "🗑️", "🪴", "🐶", "🐱", "💰", "💳", "📈", "🧾"],
  },
  {
    label: "Work & social",
    emojis: ["💻", "📱", "📵", "🔕", "📧", "⏰", "📅", "✅", "📞", "💬", "👪", "🤝", "💌", "🎁"],
  },
  {
    label: "Nature",
    emojis: ["☀️", "🌙", "⭐", "✨", "🔥", "🌱", "🌻", "🌳", "🌊", "🏞️", "⛰️", "🌍"],
  },
];

/** First user-perceived character of `text` if it is an emoji, else `null`. */
function firstEmoji(text: string): string | null {
  const [first] = new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text.trim());
  const emoji = first?.segment;
  // The backend caps icons at 16 characters (long ZWJ sequences can exceed it).
  return emoji && /\p{Extended_Pictographic}/u.test(emoji) && emoji.length <= 16 ? emoji : null;
}

/**
 * The last tile of the icon grid: opens a popover with more emojis, plus a field for any emoji
 * from the OS keyboard. Must sit inside a `relative` container, which the popover spans.
 */
export function EmojiPicker({
  value,
  isCustom,
  onChange,
}: {
  value: string;
  /** Whether `value` is outside the preset tiles, so this tile shows it as selected. */
  isCustom: boolean;
  onChange: (emoji: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !buttonRef.current?.contains(target)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function choose(emoji: string) {
    onChange(emoji);
    setTyped("");
    setOpen(false);
  }

  const typedEmoji = firstEmoji(typed);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        title="More icons"
        aria-label={isCustom ? `Custom icon ${value}, choose another` : "More icons"}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(!open)}
        className={cn(
          "grid aspect-square place-items-center rounded-xl border text-lg transition sm:text-xl",
          isCustom
            ? "border-brand bg-brand/10 ring-2 ring-brand/20"
            : "border-dashed border-line bg-subtle text-muted hover:border-brand hover:text-brand",
        )}
      >
        {isCustom ? value : <SmilePlus className="size-4.5" aria-hidden />}
      </button>

      {open && (
        <div
          ref={rootRef}
          role="dialog"
          aria-label="Pick an icon"
          className="absolute inset-x-0 top-full z-30 mt-2 animate-pop rounded-2xl border border-line bg-surface p-3 shadow-lift"
        >
          <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
            {EMOJI_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="mb-1.5 text-xs font-medium text-muted">{group.label}</p>
                <div className="grid grid-cols-8 gap-1 sm:grid-cols-10">
                  {group.emojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      aria-label={`Icon ${emoji}`}
                      aria-pressed={value === emoji}
                      onClick={() => choose(emoji)}
                      className={cn(
                        "grid aspect-square place-items-center rounded-lg text-xl transition hover:bg-subtle",
                        value === emoji && "bg-brand/10 ring-2 ring-brand/30",
                      )}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* A div, not a form: it already sits inside the habit form. */}
          <div className="mt-3 flex gap-2 border-t border-line pt-3">
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault(); // Enter would otherwise submit the habit form
                if (typedEmoji) choose(typedEmoji);
              }}
              placeholder="Or type / paste any emoji"
              aria-label="Any emoji"
              className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 text-base outline-none placeholder:text-muted/70 focus:border-brand sm:text-sm"
            />
            <button
              type="button"
              disabled={!typedEmoji}
              onClick={() => typedEmoji && choose(typedEmoji)}
              aria-label="Use this emoji"
              className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand text-white transition disabled:opacity-40"
            >
              {typedEmoji ?? <Check className="size-4" strokeWidth={3} aria-hidden />}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
