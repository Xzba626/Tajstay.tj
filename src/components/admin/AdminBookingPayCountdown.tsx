"use client";

import { useEffect, useState } from "react";

/** Компактный таймер окна оплаты для списка броней в админке. */
export function AdminBookingPayCountdown({
  expiresAtIso,
  active
}: {
  expiresAtIso: string | null;
  active: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !active || !expiresAtIso) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [mounted, active, expiresAtIso]);

  if (!active || !expiresAtIso) {
    return <span className="text-slate-500">—</span>;
  }

  if (!mounted) {
    return <span className="text-slate-400">…</span>;
  }

  const exp = new Date(expiresAtIso).getTime();
  if (Number.isNaN(exp)) return <span className="text-slate-500">—</span>;

  const ms = exp - (now || Date.now());
  if (ms <= 0) {
    return <span className="font-semibold text-red-600">Истекло</span>;
  }

  const totalSec = Math.floor(ms / 1000);
  const mm = Math.floor(totalSec / 60);
  const ss = totalSec % 60;
  return (
    <span className="tabular-nums font-medium text-amber-700" title="Окно на оплату / чек">
      {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
    </span>
  );
}
