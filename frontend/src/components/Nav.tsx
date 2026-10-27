"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  Compass,
  ChartColumnBig,
  CircleCheckBig,
  ListChecks,
  LogOut,
  UserPlus,
  Monitor,
  Moon,
  Sun,
} from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useState } from "react";

import { Logo } from "@/components/Logo";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { startTour } from "@/hooks/useTour";
import { LOGIN_PATH, PUBLIC_PATHS, api } from "@/lib/api";
import { cn } from "@/lib/cn";

const LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Today", icon: CircleCheckBig },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/insights", label: "Insights", icon: ChartColumnBig },
  { href: "/habits", label: "Habits", icon: ListChecks },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/** Glass top bar with links on larger screens; a fixed bottom tab bar on phones. */
export function Nav() {
  const pathname = usePathname();
  if (PUBLIC_PATHS.includes(pathname)) return null;

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/75 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-5xl items-center gap-6 px-4">
          <Link href="/" aria-label="Home" className="rounded-lg">
            <Logo />
          </Link>
          <ul
            data-tour="nav"
            className="hidden items-center gap-1 rounded-xl bg-subtle/80 p-1 text-sm sm:flex"
          >
            {LINKS.map(({ href, label }) => {
              const active = isActive(pathname, href);
              return (
                <li key={href} className="relative">
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-lg bg-surface shadow-card"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                    />
                  )}
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative block rounded-lg px-3.5 py-1.5 font-medium transition-colors",
                      active ? "text-fg" : "text-muted hover:text-fg",
                    )}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <UserMenu />
        </nav>
      </header>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line/70 bg-bg/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl sm:hidden"
      >
        <ul data-tour="nav" className="grid grid-cols-4 px-2">
          {LINKS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors",
                    active ? "text-brand" : "text-muted",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-7 w-12 place-items-center rounded-full transition-colors",
                      active && "bg-brand/12",
                    )}
                  >
                    <Icon className="size-5" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                  </span>
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

const THEMES = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

function UserMenu() {
  const user = useCurrentUser();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    try {
      await api.logout();
    } finally {
      window.location.assign(LOGIN_PATH);
    }
  }

  if (!user) return <div className="ml-auto size-9 animate-pulse rounded-full bg-subtle" />;
  const pending = user.is_admin ? user.pending_access_requests : 0;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        data-tour="account"
        className="ml-auto flex items-center gap-2 rounded-full p-0.5 transition outline-none hover:ring-4 hover:ring-subtle focus-visible:ring-4 focus-visible:ring-brand/30 sm:pr-3"
        aria-label={
          pending > 0
            ? `Account menu, ${pending} access request${pending === 1 ? "" : "s"} waiting`
            : "Account menu"
        }
      >
        <span className="relative">
          {user.avatar_url ? (
            <Image
              src={user.avatar_url}
              alt=""
              width={36}
              height={36}
              className="size-9 rounded-full border border-line"
            />
          ) : (
            <span className="grid size-9 place-items-center rounded-full bg-brand-gradient font-semibold text-white">
              {user.login[0]?.toUpperCase()}
            </span>
          )}
          {pending > 0 && (
            <span className="absolute -top-0.5 -right-0.5 size-3 rounded-full border-2 border-bg bg-brand" />
          )}
        </span>
        <span className="hidden text-sm font-medium sm:inline">{user.login}</span>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-60 rounded-xl border border-line bg-surface p-1.5 shadow-lift data-[state=open]:animate-fade-up"
        >
          <div className="px-2.5 py-2">
            <p className="truncate text-sm font-semibold">{user.name ?? user.login}</p>
            <p className="truncate text-xs text-muted">@{user.login}</p>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-line" />
          {user.is_admin && (
            <>
              <DropdownMenu.Item asChild>
                <Link
                  href="/admin/access"
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-subtle"
                >
                  <UserPlus className="size-4" aria-hidden />
                  Access requests
                  {pending > 0 && (
                    <span className="ml-auto rounded-full bg-brand px-1.5 py-0.5 text-xs font-semibold text-white tabular-nums">
                      {pending}
                    </span>
                  )}
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="my-1 h-px bg-line" />
            </>
          )}
          <DropdownMenu.Item
            onSelect={() => {
              startTour();
              if (pathname !== "/") router.push("/");
            }}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-subtle"
          >
            <Compass className="size-4" aria-hidden />
            Take the tour
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-line" />
          <DropdownMenu.Label className="px-2.5 pt-1.5 pb-1 text-xs font-medium text-muted">
            Theme
          </DropdownMenu.Label>
          <DropdownMenu.RadioGroup value={theme} onValueChange={setTheme}>
            {THEMES.map(({ value, label, icon: Icon }) => (
              <DropdownMenu.RadioItem
                key={value}
                value={value}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-subtle data-[state=checked]:font-medium data-[state=checked]:text-brand"
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
          <DropdownMenu.Separator className="my-1 h-px bg-line" />
          <DropdownMenu.Item
            disabled={signingOut}
            onSelect={signOut}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-bad outline-none data-[disabled]:opacity-50 data-[highlighted]:bg-bad/10"
          >
            <LogOut className="size-4" aria-hidden />
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
