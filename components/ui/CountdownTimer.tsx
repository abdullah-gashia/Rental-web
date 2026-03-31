"use client";

/**
 * CountdownTimer — hydration-safe live countdown.
 *
 * Hydration strategy:
 *   - Initial state is `null` on both server and client → both render
 *     the "--:--:--" skeleton → no mismatch.
 *   - After mount, useEffect populates real time and ticks every second.
 *   - The layout never shifts because the skeleton is the same width
 *     as the live value (monospace, fixed 8 chars "HH:MM:SS").
 */

import { useState, useEffect, useCallback } from "react";

interface TimeLeft {
  hours:   number;
  minutes: number;
  seconds: number;
}

function computeTimeLeft(targetMs: number): TimeLeft | null {
  const diff = targetMs - Date.now();
  if (diff <= 0) return null;
  return {
    hours:   Math.floor(diff / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1_000),
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

interface CountdownTimerProps {
  /** ISO string — the exact moment the countdown expires */
  targetDate: string;
  /** Extra Tailwind classes for the <span> wrapper */
  className?: string;
  /** Called once when the countdown reaches zero */
  onExpire?: () => void;
}

export default function CountdownTimer({
  targetDate,
  className = "",
  onExpire,
}: CountdownTimerProps) {
  const targetMs = new Date(targetDate).getTime();

  // null → not yet mounted; both SSR and first client render are null
  // so React's hydration sees identical HTML and skips a mismatch error.
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);

  const tick = useCallback(() => {
    const remaining = computeTimeLeft(targetMs);
    setTimeLeft(remaining);
    if (remaining === null) onExpire?.();
  }, [targetMs, onExpire]);

  useEffect(() => {
    tick();                            // run immediately after mount
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [tick]);

  // Skeleton — same char-width as live value; shown on server + before first tick
  if (timeLeft === null) {
    return (
      <span className={`font-mono tabular-nums ${className}`}>
        --:--:--
      </span>
    );
  }

  return (
    <span className={`font-mono tabular-nums ${className}`}>
      {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
    </span>
  );
}
