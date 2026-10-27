"use client";

import type { LucideIcon } from "lucide-react";
import {
  Check,
  ExternalLink,
  Inbox,
  ShieldBan,
  ShieldCheck,
  UserCheck,
  UserX,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button, ButtonLink, EmptyState, ErrorBanner, PageHeader, Skeleton } from "@/components/ui";
import { useAsync } from "@/hooks/useAsync";
import { reloadCurrentUser, useCurrentUser } from "@/hooks/useCurrentUser";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatRelative } from "@/lib/dates";
import type { AccessRequest, AccessStatus } from "@/lib/types";

type Tab = "pending" | "approved" | "declined";

const TABS: { id: Tab; label: string; statuses: AccessStatus[] }[] = [
  { id: "pending", label: "Pending", statuses: ["pending"] },
  { id: "approved", label: "Approved", statuses: ["approved"] },
  { id: "declined", label: "Declined", statuses: ["denied", "revoked"] },
];

const EMPTY: Record<Tab, { icon: LucideIcon; title: string; body: string }> = {
  pending: {
    icon: Inbox,
    title: "No pending requests",
    body: "You're all caught up. New requests from the login page will appear here, and you'll get an email if SMTP is set up.",
  },
  approved: {
    icon: UserCheck,
    title: "No approved guests yet",
    body: "People you approve can sign in with GitHub and keep their own habits.",
  },
  declined: {
    icon: UserX,
    title: "Nothing declined",
    body: "Declined and revoked requests show up here. They can always request again.",
  },
};

const STATUS_BADGE: Record<AccessStatus, string> = {
  pending: "bg-warn/15 text-warn",
  approved: "bg-ok/15 text-ok",
  denied: "bg-bad/10 text-bad",
  revoked: "bg-bad/10 text-bad",
};

export default function AccessRequestsPage() {
  const user = useCurrentUser();
  const requests = useAsync(() => api.listAccessRequests(), [], user?.is_admin === true);
  const [tab, setTab] = useState<Tab>("pending");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [revoking, setRevoking] = useState<AccessRequest | null>(null);

  if (!user) return <Skeleton className="h-96" />;
  if (!user.is_admin) {
    return (
      <EmptyState
        icon={ShieldBan}
        title="Admins only"
        className="mt-6 border-solid"
        action={<ButtonLink href="/">Back to today</ButtonLink>}
      >
        Only the people in HABIT_ADMIN_GITHUB_USERS can review access requests.
      </EmptyState>
    );
  }

  async function decide(request: AccessRequest, status: Exclude<AccessStatus, "pending">) {
    setBusyId(request.id);
    try {
      await api.decideAccessRequest(request.id, status);
      const verb = { approved: "Approved", denied: "Declined", revoked: "Revoked access for" }[
        status
      ];
      toast.success(`${verb} @${request.login}`);
      requests.reload();
      void reloadCurrentUser(); // refresh the pending badge
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusyId(null);
    }
  }

  const all = requests.data ?? [];
  const current = TABS.find((t) => t.id === tab)!;
  const visible = all.filter((r) => current.statuses.includes(r.status));
  const counts = Object.fromEntries(
    TABS.map((t) => [t.id, all.filter((r) => t.statuses.includes(r.status)).length]),
  ) as Record<Tab, number>;

  return (
    <>
      <PageHeader
        title="Access requests"
        subtitle="Decide who can use this invite-only instance."
      />

      {requests.error && <ErrorBanner message={requests.error} onRetry={requests.reload} />}

      <div
        role="tablist"
        className="mb-5 inline-flex w-full rounded-xl bg-subtle p-1 text-sm sm:w-auto"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className="relative flex-1 rounded-lg px-4 py-2 font-medium sm:flex-none"
          >
            {tab === t.id && (
              <motion.span
                layoutId="access-tab"
                className="absolute inset-0 rounded-lg bg-surface shadow-card"
                transition={{ type: "spring", bounce: 0.2, duration: 0.35 }}
              />
            )}
            <span className={cn("relative", tab === t.id ? "text-fg" : "text-muted")}>
              {t.label}
              {counts[t.id] > 0 && (
                <span
                  className={cn(
                    "ml-1.5 rounded-full px-1.5 py-0.5 text-xs tabular-nums",
                    t.id === "pending" ? "bg-brand text-white" : "bg-line text-muted",
                  )}
                >
                  {counts[t.id]}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>

      {!requests.data ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }, (_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState icon={EMPTY[tab].icon} title={EMPTY[tab].title}>
          {EMPTY[tab].body}
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {visible.map((request) => (
            <motion.li
              key={request.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface p-4 shadow-card"
            >
              <Avatar request={request} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={`https://github.com/${request.login}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-semibold hover:underline"
                  >
                    @{request.login}
                    <ExternalLink className="size-3.5 text-muted" aria-hidden />
                  </a>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                      STATUS_BADGE[request.status],
                    )}
                  >
                    {request.status}
                  </span>
                </div>
                {request.name && <p className="truncate text-sm text-muted">{request.name}</p>}
                <p className="mt-1 text-xs text-muted">
                  Requested {formatRelative(request.requested_at)}
                  {request.decided_at &&
                    ` · ${request.status} ${formatRelative(request.decided_at)}${request.decided_by ? ` by @${request.decided_by}` : ""}`}
                </p>
              </div>
              <div className="flex w-full gap-2 sm:w-auto">
                {request.status === "pending" && (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1 sm:flex-none"
                      disabled={busyId === request.id}
                      onClick={() => decide(request, "denied")}
                    >
                      <X className="size-4" aria-hidden /> Decline
                    </Button>
                    <Button
                      variant="brand"
                      size="sm"
                      className="flex-1 sm:flex-none"
                      disabled={busyId === request.id}
                      onClick={() => decide(request, "approved")}
                    >
                      <Check className="size-4" aria-hidden /> Approve
                    </Button>
                  </>
                )}
                {request.status === "approved" && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1 text-bad hover:bg-bad/10 sm:flex-none"
                    disabled={busyId === request.id}
                    onClick={() => setRevoking(request)}
                  >
                    <ShieldBan className="size-4" aria-hidden /> Revoke
                  </Button>
                )}
                {(request.status === "denied" || request.status === "revoked") && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1 sm:flex-none"
                    disabled={busyId === request.id}
                    onClick={() => decide(request, "approved")}
                  >
                    <ShieldCheck className="size-4" aria-hidden /> Approve
                  </Button>
                )}
              </div>
            </motion.li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={revoking !== null}
        onOpenChange={(open) => !open && setRevoking(null)}
        title={`Revoke access for @${revoking?.login}?`}
        description="They'll be signed out on every device and can't sign in again unless you approve a new request. Their habits are kept."
        confirmLabel="Revoke access"
        onConfirm={() => {
          if (revoking) void decide(revoking, "revoked");
          setRevoking(null);
        }}
      />
    </>
  );
}

function Avatar({ request }: { request: AccessRequest }) {
  return request.avatar_url ? (
    <Image
      src={request.avatar_url}
      alt=""
      width={48}
      height={48}
      className="size-12 shrink-0 rounded-full border border-line"
    />
  ) : (
    <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-gradient text-lg font-semibold text-white">
      {request.login[0]?.toUpperCase()}
    </span>
  );
}
