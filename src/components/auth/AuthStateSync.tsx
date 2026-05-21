"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { AUTH_ROLE_CHANGED_EVENT, dispatchAuthRoleChanged } from "@/lib/auth/authEvents";
import { NOTIFICATION_NEW_EVENT } from "@/lib/pwa/notificationEvents";
import { dispatchNotificationToast } from "@/lib/pwa/notificationEvents";

type MeResponse = { user: { role: string } | null };

/**
 * Soft-refresh server layout when role changes (e.g. owner application approved).
 * Server session already reads fresh User from DB — client only needs router.refresh().
 */
export function AuthStateSync() {
  const router = useRouter();
  const lastRole = useRef<string | null>(null);
  const refreshing = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function sync(reason?: string) {
      if (refreshing.current) return;
      try {
        const res = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as MeResponse;
        const role = json.user?.role;
        if (!role) {
          lastRole.current = null;
          return;
        }
        const prev = lastRole.current;
        if (prev && prev !== role) {
          refreshing.current = true;
          dispatchAuthRoleChanged({ role, previousRole: prev });
          if (role === "OWNER") {
            dispatchNotificationToast("Вы стали владельцем — открываем кабинет…");
            router.push("/dashboard/owner?onboarding=1");
          } else {
            router.refresh();
          }
          refreshing.current = false;
        } else if (reason === "poll") {
          /* noop */
        }
        lastRole.current = role;
      } catch {
        refreshing.current = false;
      }
    }

    void sync("init");
    const interval = window.setInterval(() => void sync("poll"), 12_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void sync("visible");
    };
    const onNotif = () => void sync("notification");
    const onRole = () => router.refresh();

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener(NOTIFICATION_NEW_EVENT, onNotif);
    window.addEventListener(AUTH_ROLE_CHANGED_EVENT, onRole);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(NOTIFICATION_NEW_EVENT, onNotif);
      window.removeEventListener(AUTH_ROLE_CHANGED_EVENT, onRole);
    };
  }, [router]);

  return null;
}
