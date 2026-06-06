"use client";

import { useEffect, useMemo, useState } from "react";

function pad2(n: number) {
  return String(Math.max(0, Math.floor(n))).padStart(2, "0");
}

type Props = {
  expiresAtIso: string | null;
  paused?: boolean;
  pausedLabel?: string;
};

export function ChatTimerChip({ expiresAtIso, paused, pausedLabel }: Props) {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(0);
  const expiresAt = useMemo(() => (expiresAtIso ? new Date(expiresAtIso) : null), [expiresAtIso]);

  useEffect(() => {
    setMounted(true);
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  if (!mounted) {
    return <span className="messenger-timer messenger-timer--muted">--:--</span>;
  }

  if (paused) {
    return (
      <span className="messenger-timer messenger-timer--warn" suppressHydrationWarning>
        {pausedLabel ?? "—"}
      </span>
    );
  }

  if (!expiresAt || Number.isNaN(expiresAt.getTime())) return null;

  const ms = expiresAt.getTime() - now;
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;

  let tone: "muted" | "warn" | "danger" = "muted";
  if (totalSec < 60) tone = "danger";
  else if (totalSec < 300) tone = "warn";

  return (
    <span className={`messenger-timer messenger-timer--${tone}`} suppressHydrationWarning>
      {pad2(min)}:{pad2(sec)}
    </span>
  );
}
