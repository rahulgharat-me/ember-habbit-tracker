import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  ChartColumnBig,
  CircleCheck,
  Clock,
  Coffee,
  Flame,
  Info,
  KeyRound,
  Lock,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { LogoMark } from "@/components/Logo";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { fetchAuthConfig } from "@/lib/server";

export const metadata: Metadata = {
  title: "Sign in",
};

const ERROR_MESSAGES: Record<string, string> = {
  not_configured:
    "GitHub sign-in isn't set up yet. Add HABIT_GITHUB_CLIENT_ID and HABIT_GITHUB_CLIENT_SECRET to .env and restart the app.",
  denied: "Sign-in was cancelled on GitHub.",
  invalid_state: "Your sign-in attempt expired. Please try again.",
  github: "Couldn't sign in with GitHub. Please try again.",
};

const FEATURES: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Flame,
    title: "Streaks that motivate",
    body: "Complete every habit to keep the flame alive.",
  },
  {
    icon: Coffee,
    title: "Rest days built in",
    body: "Weekly days off and holidays never break a streak.",
  },
  {
    icon: CalendarDays,
    title: "Calendar view",
    body: "See every day of your journey at a glance.",
  },
  {
    icon: ChartColumnBig,
    title: "Real insights",
    body: "Find your strongest days and weekly trends.",
  },
];

const GITHUB_MARK =
  "M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.6-1.6 0-3.2 0 0 1-.3 3.4 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.8 0 3.2.9.8 1.3 1.9 1.3 3.2 0 4.6-2.8 5.6-5.5 5.9.5.4.9 1 .9 2.2v3.3c0 .3.1.7.8.6A12 12 0 0 0 12 .3";

const SIGN_IN_URL = "/api/auth/github/login";
const REQUEST_ACCESS_URL = "/api/auth/github/login?intent=request";

type Tone = "success" | "info" | "error";

const TONES: Record<Tone, { box: string; icon: LucideIcon }> = {
  success: { box: "border-ok/25 bg-ok/10 text-ok", icon: CircleCheck },
  info: { box: "border-warn/30 bg-warn/10 text-fg", icon: Clock },
  error: { box: "border-bad/25 bg-bad/10 text-bad", icon: TriangleAlert },
};

function Notice({ tone, icon, children }: { tone: Tone; icon?: LucideIcon; children: ReactNode }) {
  const Icon = icon ?? TONES[tone].icon;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("mt-4 flex gap-2.5 rounded-xl border px-3.5 py-3 text-sm", TONES[tone].box)}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  );
}

function GitHubMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
      <path d={GITHUB_MARK} />
    </svg>
  );
}

/** What to tell someone coming back from GitHub without access. */
function accessNotice(access: string | undefined, error: string | undefined, who: string) {
  switch (access) {
    case "requested":
      return (
        <Notice tone="success">
          <p className="font-semibold">Request sent!</p>
          <p className="mt-0.5 text-fg/80">
            The admin has been notified. Once {who} is approved, just continue with GitHub to sign
            in.
          </p>
        </Notice>
      );
    case "pending":
      return (
        <Notice tone="info">
          <p className="font-semibold">Waiting for approval</p>
          <p className="mt-0.5 text-muted">
            {who} has already requested access. You&apos;ll be able to sign in as soon as the admin
            approves it.
          </p>
        </Notice>
      );
    case "denied":
      return (
        <Notice tone="error" icon={Lock}>
          Your request for {who} was declined. You can ask again below.
        </Notice>
      );
    case "revoked":
      return (
        <Notice tone="error" icon={Lock}>
          Access for {who} has been revoked. You can request it again below.
        </Notice>
      );
  }
  if (error === "not_allowed") {
    return (
      <Notice tone="info" icon={KeyRound}>
        <p className="font-semibold">{APP_NAME} is invite-only</p>
        <p className="mt-0.5 text-muted">
          {who} isn&apos;t on the guest list yet. Request access and the admin will review it.
        </p>
      </Notice>
    );
  }
  return null;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; access?: string; login?: string }>;
}) {
  const [{ error, access, login }, config] = await Promise.all([searchParams, fetchAuthConfig()]);
  const who = login ? `@${login}` : "your account";
  const notice = accessNotice(access, error, who);
  const errorMessage = !notice && error ? (ERROR_MESSAGES[error] ?? ERROR_MESSAGES.github) : null;
  const waiting = access === "requested" || access === "pending";
  const needsAccess = error === "not_allowed" || access === "denied" || access === "revoked";
  const showRequest = config.invite_only && !waiting;

  return (
    <div className="grid min-h-[calc(100dvh-6rem)] items-center gap-10 lg:grid-cols-2 lg:gap-16">
      {/* Brand story: desktop only */}
      <section className="relative hidden overflow-hidden rounded-3xl bg-brand-gradient p-10 text-white shadow-glow lg:block">
        <Flame
          className="pointer-events-none absolute -right-16 -bottom-20 size-96 text-white/10"
          strokeWidth={1}
          aria-hidden
        />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
            <Flame className="size-3.5" aria-hidden /> Daily habit tracker
          </div>
          <h2 className="mt-6 text-4xl leading-tight font-bold tracking-tight text-balance">
            Small habits, done daily, change everything.
          </h2>
          <ul className="mt-10 space-y-5">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-3.5">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/15 backdrop-blur">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span>
                  <span className="block font-semibold">{title}</span>
                  <span className="text-sm text-white/80">{body}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Sign-in card */}
      <section className="mx-auto w-full max-w-sm animate-fade-up">
        <div className="text-center">
          <LogoMark size={64} className="mx-auto drop-shadow-[0_10px_24px_rgb(249_115_22/0.45)]" />
          <h1 className="mt-5 text-3xl font-bold tracking-tight">{APP_NAME}</h1>
          <p className="mt-1.5 text-muted">{APP_TAGLINE}</p>
        </div>

        <div className="mt-8 rounded-2xl border border-line bg-surface p-6 shadow-lift">
          <h2 className="font-semibold">Welcome</h2>
          <p className="mt-1 text-sm text-muted">Sign in to see your habits and streaks.</p>

          {notice}
          {errorMessage && <Notice tone="error">{errorMessage}</Notice>}

          {/* Full page navigations: the API redirects to GitHub. */}
          <a
            href={SIGN_IN_URL}
            className={cn(
              "mt-6 flex h-12 w-full items-center justify-center gap-3 rounded-xl font-medium shadow-card transition active:scale-[0.98]",
              needsAccess
                ? "border border-line bg-surface text-fg hover:bg-subtle"
                : "bg-[#1f2328] text-white hover:bg-[#32383f] dark:bg-white dark:text-[#1f2328] dark:hover:bg-stone-200",
            )}
          >
            <GitHubMark />
            {waiting ? "Try signing in again" : "Continue with GitHub"}
          </a>

          {showRequest && (
            <>
              <div className="my-5 flex items-center gap-3 text-xs text-muted">
                <span className="h-px flex-1 bg-line" />
                {needsAccess ? "Not on the list yet?" : "New here?"}
                <span className="h-px flex-1 bg-line" />
              </div>
              <a
                href={REQUEST_ACCESS_URL}
                className={cn(
                  "flex h-12 w-full items-center justify-center gap-2.5 rounded-xl font-medium transition active:scale-[0.98]",
                  needsAccess
                    ? "bg-brand-gradient text-white shadow-glow hover:brightness-110"
                    : "border border-line bg-surface text-fg shadow-card hover:bg-subtle",
                )}
              >
                <KeyRound className="size-4" aria-hidden />
                {access === "denied" || access === "revoked"
                  ? "Request access again"
                  : "Request access"}
              </a>
              <p className="mt-2.5 text-center text-xs text-muted">
                You&apos;ll confirm your identity with GitHub, then the admin reviews your request.
              </p>
            </>
          )}

          <p className="mt-5 flex items-start gap-2 text-xs text-muted">
            <ShieldCheck className="size-4 shrink-0 text-ok" aria-hidden />
            We only read your public GitHub profile (username and avatar). No access to your
            repositories or email.
          </p>
        </div>

        <Link
          href="/about"
          className="mt-5 flex items-center justify-center gap-1.5 text-sm text-muted transition-colors hover:text-fg"
        >
          <Info className="size-4" aria-hidden /> About this project
        </Link>
      </section>
    </div>
  );
}
