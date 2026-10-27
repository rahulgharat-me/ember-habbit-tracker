import { Compass, House } from "lucide-react";

import { ButtonLink, EmptyState } from "@/components/ui";

export default function NotFound() {
  return (
    <EmptyState
      icon={Compass}
      title="This page wandered off"
      className="mt-6 border-solid sm:mt-12"
      action={
        <ButtonLink href="/" variant="brand">
          <House className="size-4" aria-hidden /> Back to today
        </ButtonLink>
      }
    >
      The page you&apos;re looking for doesn&apos;t exist. Your streak is safe, though.
    </EmptyState>
  );
}
