"use client";

import { type DependencyList, useCallback, useEffect, useState } from "react";

import { errorMessage } from "@/lib/api";

interface AsyncState<T> {
  data: T | undefined;
  error: string | null;
  loading: boolean;
}

/**
 * Runs `load` whenever `deps` change (or `reload` is called) and tracks its result.
 * Previous data is kept while reloading so the UI does not flicker.
 * Pass `enabled = false` to wait until inputs (e.g. today's date) are available.
 */
export function useAsync<T>(load: () => Promise<T>, deps: DependencyList, enabled = true) {
  const [state, setState] = useState<AsyncState<T>>({
    data: undefined,
    error: null,
    loading: true,
  });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    load().then(
      (data) => !cancelled && setState({ data, error: null, loading: false }),
      (error) =>
        !cancelled && setState((s) => ({ ...s, error: errorMessage(error), loading: false })),
    );
    return () => {
      cancelled = true;
    };
    // `load` is intentionally excluded: callers pass an inline closure described by `deps`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { ...state, reload };
}
