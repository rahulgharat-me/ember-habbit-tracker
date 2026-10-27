import { useId } from "react";

import { APP_NAME } from "@/lib/brand";
import { cn } from "@/lib/cn";

/** Flame with a check cut out, on a gradient tile. */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  // Unique gradient ids so several logos on one page don't clash.
  const id = useId().replace(/:/g, "");
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <defs>
        <linearGradient
          id={`${id}-bg`}
          x1="8"
          y1="4"
          x2="56"
          y2="60"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#fdba74" />
          <stop offset="0.45" stopColor="#f97316" />
          <stop offset="1" stopColor="#e11d48" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill={`url(#${id}-bg)`} />
      <path
        fill="#fff"
        d="M32 9c1.5 7.5 7 11.5 10.5 17 3 4.8 4 9 3.5 13-.8 8.5-6.8 15-14 15s-13.2-6.5-14-14.5c-.5-6 2.5-11 6.5-14.5.3 4 2 6.5 4 7.5C27.8 24 30 15.5 32 9Z"
      />
      <path
        fill="none"
        stroke={`url(#${id}-bg)`}
        strokeWidth="4.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M25.5 41.5 30 46l8.5-9.5"
      />
    </svg>
  );
}

export function Logo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      <span className="text-lg font-semibold tracking-tight">{APP_NAME}</span>
    </span>
  );
}
