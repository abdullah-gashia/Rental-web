"use client";

import { useEffect, useRef } from "react";
import { logItemView } from "@/lib/actions/tracking";
import type { TrackingParams } from "@/lib/actions/tracking";

interface UseTrackViewParams extends TrackingParams {
  /** Pass `isOpen` (modal) or `true` (full page) — tracking only fires when enabled. */
  enabled:         boolean;
  isAuthenticated: boolean;
}

/**
 * Fires `logItemView` exactly once per (enabled=true + itemId) pair.
 * The `useRef` guard prevents double-firing in React 18 Strict Mode.
 * Resets automatically when `enabled` flips to false (e.g., modal closes).
 */
export function useTrackView({
  enabled,
  isAuthenticated,
  ...params
}: UseTrackViewParams): void {
  const trackedId = useRef<string | null>(null);

  // Fire tracking once per opening / item change
  useEffect(() => {
    if (!enabled || !isAuthenticated || !params.itemId) return;
    if (trackedId.current === params.itemId) return; // already tracked this session
    trackedId.current = params.itemId;

    // Fire-and-forget — no await, errors handled inside the action
    logItemView(params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, params.itemId]);

  // Reset tracker when modal/panel closes so re-open triggers again
  useEffect(() => {
    if (!enabled) {
      trackedId.current = null;
    }
  }, [enabled]);
}
