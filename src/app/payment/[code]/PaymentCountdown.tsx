"use client";

import { useEffect, useMemo, useState } from "react";

function pad2(n: number) {
  return String(Math.max(0, Math.floor(n))).padStart(2, "0");
}

export function PaymentCountdown({
  expiresAtIso,
  paused,
  pausedLabel
}: {
  expiresAtIso: string | null;
  paused?: boolean;
  pausedLabel?: string;
}) {
  const [isMounted, setIsMounted] = useState(false);
  const expiresAt = useMemo(() => (expiresAtIso ? new Date(expiresAtIso) : null), [expiresAtIso]);
  const [now, setNow] = useState(0);

  useEffect(() => {
    setIsMounted(true);
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  if (!isMounted) {
    return <span>--:--</span>;
  }

  if (paused) {
    return (
      <span suppressHydrationWarning className="text-amber-200">
        {pausedLabel ?? "—"}
      </span>
    );
  }

  if (!expiresAt || Number.isNaN(expiresAt.getTime())) {
    return <span>—</span>;
  }

  const ms = expiresAt.getTime() - now;
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;

  return (
    <span suppressHydrationWarning>
      {pad2(min)}:{pad2(sec)}
    </span>
  );
}
