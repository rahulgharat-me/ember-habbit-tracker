import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  CalendarDays,
  ChartColumnBig,
  CircleCheckBig,
  Coffee,
  Database,
  FlaskConical,
  KeyRound,
  ListChecks,
  MonitorSmartphone,
  Server,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { LogoMark } from "@/components/Logo";
import { Card, CardTitle, buttonClass } from "@/components/ui";
import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE, REPO_URL } from "@/lib/brand";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "About",
  description: APP_DESCRIPTION,
};

const FEATURES: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: CircleCheckBig,
    title: "Today",
    body: "Mark each habit done or missed, edit past days, and watch the streak and progress ring.",
  },
  {
    icon: CalendarDays,
    title: "Calendar",
    body: "A month view colored by day status. Click any day to fix it, or filter by one habit.",
  },
  {
    icon: ChartColumnBig,
    title: "Insights",
    body: "Year heatmap, completion by weekday, a 12-week trend and a per-habit leaderboard.",
  },
  {
    icon: ListChecks,
    title: "Habits",
    body: "Name, icon, color, start date, weekly schedule and one-off days off. Archive keeps history.",
  },
  {
    icon: Coffee,
    title: "Days off that don't hurt",
    body: "Weekly schedules and holidays neither break nor extend a streak.",
  },
  {
    icon: KeyRound,
    title: "Invite-only mode",
    body: "Visitors request access via GitHub; admins approve, decline or revoke, with optional email alerts.",
  },
];

const STACK: { layer: string; items: string }[] = [
  { layer: "Frontend", items: "Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 4" },
  { layer: "UI", items: "Radix UI · lucide icons · motion · sonner · next-themes" },
  { layer: "Backend", items: "Python · FastAPI · SQLAlchemy 2 · Pydantic" },
  { layer: "Data", items: "SQLite · Alembic migrations (applied on startup)" },
  { layer: "Auth", items: "GitHub OAuth · server-side sessions · HttpOnly cookie" },
  { layer: "Quality", items: "pytest · ruff · ESLint · Prettier · strict TypeScript" },
];

const HIGHLIGHTS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: FlaskConical,
    title: "Streak logic as pure functions",
    body: "All streak and rate rules live in one side-effect-free module with unit tests, separate from the database.",
  },
  {
    icon: ShieldCheck,
    title: "First-party sessions",
    body: "The browser only talks to Next.js, which proxies /api to FastAPI on localhost. No CORS, no tokens in JavaScript.",
  },
  {
    icon: Database,
    title: "Migrations that can't drift",
    body: "Alembic upgrades the schema on boot, and a test fails if models and migrations disagree.",
  },
  {
    icon: Smartphone,
    title: "Installable, phone-first UI",
    body: "Web manifest and icons, bottom tab bar on phones, light and dark themes, a guided first-run tour.",
  },
];

const FLOW: { icon: LucideIcon; label: string; detail: string }[] = [
  { icon: MonitorSmartphone, label: "Browser", detail: "React UI" },
  { icon: Server, label: "Next.js", detail: "pages + /api proxy" },
  { icon: Server, label: "FastAPI", detail: "routes → services" },
  { icon: Database, label: "SQLite", detail: "data/habits.db" },
];

function GitHubMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
      <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.6-1.6 0-3.2 0 0 1-.3 3.4 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.8 0 3.2.9.8 1.3 1.9 1.3 3.2 0 4.6-2.8 5.6-5.5 5.9.5.4.9 1 .9 2.2v3.3c0 .3.1.7.8.6A12 12 0 0 0 12 .3" />
    </svg>
  );
}

/** Public project overview, linked from the login page. */
export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl animate-fade-up space-y-6 sm:space-y-8">
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-fg"
      >
        <ArrowLeft className="size-4" aria-hidden /> Back to sign in
      </Link>

      <header className="relative overflow-hidden rounded-3xl bg-brand-gradient p-6 text-white shadow-glow sm:p-10">
        <div className="flex items-center gap-4">
          <LogoMark size={56} className="rounded-2xl ring-2 ring-white/30" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{APP_NAME}</h1>
            <p className="text-white/85">{APP_TAGLINE}</p>
          </div>
        </div>
        <p className="mt-6 max-w-xl text-pretty text-white/90">
          A full-stack daily habit tracker. Check in each day, keep a streak of perfect days, take
          planned days off without losing it, and see your progress over time.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {REPO_URL && (
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonClass("secondary"), "border-0")}
            >
              <GitHubMark /> View source on GitHub
            </a>
          )}
          <Link
            href="/"
            className="inline-flex h-10 items-center rounded-xl bg-white/15 px-4 text-sm font-medium backdrop-blur transition hover:bg-white/25"
          >
            Open the app
          </Link>
        </div>
      </header>

      <Card>
        <CardTitle>What it does</CardTitle>
        <ul className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
                <Icon className="size-4.5" aria-hidden />
              </span>
              <span>
                <span className="block font-medium">{title}</span>
                <span className="text-sm text-muted">{body}</span>
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardTitle>How streaks work</CardTitle>
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted marker:text-brand">
          <li>
            A <span className="font-medium text-fg">perfect day</span> is one where every habit
            scheduled that day is marked done.
          </li>
          <li>
            The <span className="font-medium text-fg">streak</span> is the run of perfect days
            ending today. Today is in progress, so it never breaks the streak before it ends.
          </li>
          <li>
            Days off and days with nothing scheduled are skipped over, not counted against you.
          </li>
          <li>
            New habits count from their start date; archived habits stop counting, history kept.
          </li>
        </ul>
      </Card>

      <Card>
        <CardTitle>How it&apos;s built</CardTitle>
        <ol className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {FLOW.map(({ icon: Icon, label, detail }, i) => (
            <li
              key={label}
              className="relative rounded-xl border border-line bg-subtle/60 px-3 py-3 text-center"
            >
              <Icon className="mx-auto size-5 text-brand" aria-hidden />
              <p className="mt-1.5 text-sm font-medium">{label}</p>
              <p className="text-xs text-muted">{detail}</p>
              {i < FLOW.length - 1 && (
                <span
                  className="absolute top-1/2 -right-2 z-10 hidden -translate-y-1/2 text-muted sm:block"
                  aria-hidden
                >
                  →
                </span>
              )}
            </li>
          ))}
        </ol>
        <dl className="divide-y divide-line text-sm">
          {STACK.map(({ layer, items }) => (
            <div key={layer} className="grid gap-1 py-2.5 sm:grid-cols-[7rem_1fr] sm:gap-4">
              <dt className="font-medium">{layer}</dt>
              <dd className="text-muted">{items}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card>
        <CardTitle>Engineering highlights</CardTitle>
        <ul className="grid gap-4 sm:grid-cols-2">
          {HIGHLIGHTS.map(({ icon: Icon, title, body }) => (
            <li key={title} className="rounded-xl border border-line p-4">
              <Icon className="size-5 text-brand" aria-hidden />
              <p className="mt-2 font-medium">{title}</p>
              <p className="mt-0.5 text-sm text-muted">{body}</p>
            </li>
          ))}
        </ul>
      </Card>

      <p className="pb-4 text-center text-xs text-muted">
        Sign-in reads only your public GitHub profile (username and avatar).
        {REPO_URL && (
          <>
            {" "}
            Source and setup guide on{" "}
            <a href={REPO_URL} target="_blank" rel="noreferrer" className="underline">
              GitHub
            </a>
            .
          </>
        )}
      </p>
    </div>
  );
}
