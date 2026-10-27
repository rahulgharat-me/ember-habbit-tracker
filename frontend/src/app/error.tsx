"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import { useEffect } from "react";

import { Button, EmptyState } from "@/components/ui";

/** Route-level error boundary: shown when rendering a page throws. */
export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <EmptyState
      icon={TriangleAlert}
      title="Something went wrong"
      className="mt-6 border-solid sm:mt-12"
      action={
        <Button variant="brand" onClick={reset}>
          <RotateCcw className="size-4" aria-hidden /> Try again
        </Button>
      }
    >
      An unexpected error occurred while showing this page. Your data has not been changed.
    </EmptyState>
  );
}
