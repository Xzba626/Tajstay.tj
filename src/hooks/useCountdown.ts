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
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [expired, setExpired] = useState(false);

  const endKey = expiresAt ?? (durationSec != null ? `d:${durationSec}` : "");

  useEffect(() => {
    if (!enabled || !endKey) {
      setSecondsLeft(0);
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

    setExpired(false);

    const tick = () => {
      const left = Math.max(0, Math.floor((endRef.current - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0) setExpired(true);
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [enabled, endKey, expiresAt, durationSec]);

  const formatted = useMemo(() => formatCountdownMmSs(secondsLeft), [secondsLeft]);

  return {
    secondsLeft,
    formatted,
    expired: enabled && Boolean(endKey) && (expired || secondsLeft <= 0)
  };
}
