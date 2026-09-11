"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatCountdownMmSs } from "@/lib/time/formatCountdown";

type Options = {
  /** ISO expiry timestamp from server */
  expiresAt?: string | null;
  /** Fixed duration when no server expiry (starts when enabled flips true) */
  durationSec?: number;
  enabled?: boolean;
};

export function useCountdown({ expiresAt, durationSec, enabled = true }: Options) {
  const endRef = useRef(0);
  // `null` means "not computed yet for the current expiry" - deliberately distinct from 0. See the
  // reset-during-render block below for why this alone isn't sufficient.
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [expired, setExpired] = useState(false);

  const endKey = expiresAt ?? (durationSec != null ? `d:${durationSec}` : "");

  // Reset synchronously DURING render when endKey changes (React's documented pattern for
  // deriving state from a changed prop without an extra flash) - not in an effect. A previous
  // version reset secondsLeft to null inside a useEffect, which runs AFTER render/commit: the
  // render that first shows a NEW endKey would still carry the PREVIOUS challenge's secondsLeft
  // (0, if that one had expired), making `expired` a false positive again on every repeat attempt,
  // not just the first. This is also why the fix cannot rely on useLayoutEffect running "before"
  // a consumer's useEffect - instrumented and confirmed React does not guarantee that ordering
  // reliably corrects a stale render before a watching effect observes it.
  const [trackedKey, setTrackedKey] = useState(endKey);
  if (trackedKey !== endKey) {
    setTrackedKey(endKey);
    setSecondsLeft(null);
    setExpired(false);
  }

  useEffect(() => {
    if (!enabled || !endKey) {
      setSecondsLeft(null);
      setExpired(false);
      return;
    }

    if (expiresAt) {
      endRef.current = new Date(expiresAt).getTime();
    } else if (durationSec != null) {
      endRef.current = Date.now() + durationSec * 1000;
    } else {
      return;
    }

    const tick = () => {
      const left = Math.max(0, Math.floor((endRef.current - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0) setExpired(true);
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [enabled, endKey, expiresAt, durationSec]);

  const formatted = useMemo(() => formatCountdownMmSs(secondsLeft ?? 0), [secondsLeft]);

  return {
    secondsLeft: secondsLeft ?? 0,
    formatted,
    expired: enabled && Boolean(endKey) && (expired || (secondsLeft !== null && secondsLeft <= 0))
  };
}
