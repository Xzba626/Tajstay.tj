"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogOut, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/cn";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";

export type AdminProfileMenuLabels = {
  profileAria: string;
  accountSecurity: string;
  logout: string;
  loggingOut: string;
  logoutConfirmTitle: string;
  logoutConfirmBody: string;
  logoutConfirmAction: string;
  logoutCancel: string;
};

type Props = {
  name: string;
  role: string;
  labels: AdminProfileMenuLabels;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "A";
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function AdminProfileMenu({ name, role, labels }: Props) {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const securityHref = (() => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("account", "security");
    return `/dashboard/admin?${next.toString()}`;
  })();

  async function doLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } finally {
      router.push("/auth/sign-in");
      router.refresh();
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="admin-header__profile-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={labels.profileAria}
      >
        <span className="admin-header__avatar" aria-hidden>
          {initials(name)}
        </span>
      </button>

      <div
        className={cn("admin-header__profile-menu", open ? "is-open" : "")}
        role="menu"
        style={{ visibility: open ? "visible" : "hidden" }}
      >
        <div className="admin-header__profile-summary">
          <span className="admin-header__avatar admin-header__avatar--lg" aria-hidden>
            {initials(name)}
          </span>
          <div className="min-w-0">
            <p className="admin-header__profile-name">{name}</p>
            <p className="admin-header__profile-role">{role}</p>
          </div>
        </div>
        <Link
          href={securityHref}
          role="menuitem"
          className="admin-header__profile-item"
          onClick={() => setOpen(false)}
        >
          <ShieldCheck className="h-4 w-4" aria-hidden />
          {labels.accountSecurity}
        </Link>
        <button
          type="button"
          role="menuitem"
          className="admin-header__profile-item admin-header__profile-item--danger"
          onClick={() => {
            setOpen(false);
            setConfirmOpen(true);
          }}
        >
          <LogOut className="h-4 w-4" aria-hidden />
          {labels.logout}
        </button>
      </div>

      <AdminConfirmDialog
        open={confirmOpen}
        title={labels.logoutConfirmTitle}
        description={labels.logoutConfirmBody}
        confirmLabel={loggingOut ? labels.loggingOut : labels.logoutConfirmAction}
        cancelLabel={labels.logoutCancel}
        variant="destructive"
        busy={loggingOut}
        onConfirm={() => void doLogout()}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
