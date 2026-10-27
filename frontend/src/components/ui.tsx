import type { LucideIcon } from "lucide-react";
import { RotateCcw, Sparkles, TriangleAlert } from "lucide-react";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/cn";

// --- Buttons ---------------------------------------------------------------------------------

type ButtonVariant = "primary" | "brand" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg" | "icon";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-fg text-bg hover:bg-fg/90 shadow-card",
  brand: "bg-brand-gradient text-white shadow-glow hover:brightness-110",
  secondary: "border border-line bg-surface text-fg hover:bg-subtle shadow-card",
  ghost: "text-muted hover:bg-subtle hover:text-fg",
  danger: "bg-bad text-white hover:bg-bad/90 shadow-card",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "h-8 gap-1.5 rounded-lg px-3 text-sm",
  md: "h-10 gap-2 rounded-xl px-4 text-sm",
  lg: "h-12 gap-2.5 rounded-xl px-5 text-base",
  icon: "size-10 rounded-xl",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md") {
  return cn(
    "inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition",
    "focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:outline-none",
    "disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
    BUTTON_VARIANTS[variant],
    BUTTON_SIZES[size],
  );
}

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button type={type} className={cn(buttonClass(variant, size), className)} {...props} />;
}

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <Link className={cn(buttonClass(variant, size), className)} {...props} />;
}

// --- Layout ----------------------------------------------------------------------------------

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 sm:mb-8 sm:gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted sm:text-base">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={cn("rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-6", className)}
    >
      {children}
    </section>
  );
}

export function CardTitle({
  children,
  icon: Icon,
  hint,
}: {
  children: ReactNode;
  icon?: LucideIcon;
  hint?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2 sm:mb-5">
      <h2 className="flex items-center gap-2 font-semibold">
        {Icon && <Icon className="size-4 text-muted" aria-hidden />}
        {children}
      </h2>
      {hint && <span className="text-right text-xs text-muted sm:text-sm">{hint}</span>}
    </div>
  );
}

// --- Data display ----------------------------------------------------------------------------

const STAT_TONES = {
  brand: "bg-brand/10 text-brand",
  ok: "bg-ok/10 text-ok",
  warn: "bg-warn/15 text-warn",
  neutral: "bg-subtle text-muted",
} as const;

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "neutral",
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: keyof typeof STAT_TONES;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-line bg-surface p-4 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs font-medium text-muted sm:text-sm">{label}</p>
        <span className={cn("rounded-lg p-1.5", STAT_TONES[tone])}>
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">{value}</p>
      {hint && <p className="mt-0.5 truncate text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function ProgressRing({
  value,
  size = 64,
  stroke = 7,
  onBrand = false,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  /** White ring for use on top of the brand gradient. */
  onBrand?: boolean;
  children?: ReactNode;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(value, 0), 1);
  const gradientId = `ring-${size}`;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--color-brand)" />
            <stop offset="1" stopColor="var(--color-brand-2)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className={onBrand ? "stroke-white/25" : "stroke-subtle"}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          stroke={onBrand ? "white" : clamped === 1 ? "var(--color-ok)" : `url(#${gradientId})`}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      {children && <div className="absolute inset-0 grid place-items-center">{children}</div>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-2xl bg-subtle", className)} />;
}

// --- Feedback --------------------------------------------------------------------------------

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="mb-4 flex items-center gap-3 rounded-xl border border-bad/25 bg-bad/10 px-4 py-3 text-sm text-bad"
    >
      <TriangleAlert className="size-4 shrink-0" aria-hidden />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1 font-medium underline-offset-2 hover:underline"
        >
          <RotateCcw className="size-3.5" aria-hidden /> Retry
        </button>
      )}
    </div>
  );
}

/** Soft, branded spot illustration: a gradient tile with an icon, framed by rings and sparkles. */
export function Illustration({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return (
    <div className={cn("relative mx-auto grid size-32 place-items-center", className)} aria-hidden>
      <div className="absolute inset-0 rounded-full bg-brand/5" />
      <div className="absolute inset-4 rounded-full bg-brand/10" />
      <div className="relative grid size-16 rotate-[-6deg] place-items-center rounded-2xl bg-brand-gradient shadow-glow">
        <Icon className="size-8 text-white" strokeWidth={1.75} />
      </div>
      <Sparkles className="absolute top-3 right-4 size-4 text-brand" />
      <span className="absolute bottom-6 left-4 size-2 rounded-full bg-brand-2/60" />
      <span className="absolute top-8 left-6 size-1.5 rounded-full bg-brand/60" />
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  children,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "animate-fade-up rounded-2xl border border-dashed border-line bg-surface/50 px-6 py-10 text-center sm:py-14",
        className,
      )}
    >
      <Illustration icon={icon} />
      <h3 className="mt-4 text-lg font-semibold tracking-tight">{title}</h3>
      {children && (
        <div className="mx-auto mt-1.5 max-w-sm text-sm text-pretty text-muted">{children}</div>
      )}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}
