import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Teach tailwind-merge about the custom shadow sizes so `shadow-card` and `shadow-lift` conflict.
const twMerge = extendTailwindMerge({
  extend: { theme: { shadow: ["card", "lift", "glow"] } },
});

/** Joins class names and resolves conflicting Tailwind classes (last one wins). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
