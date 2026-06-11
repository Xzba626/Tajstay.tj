import type { ReactNode } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/ds";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";

export default async function OwnerRequestsLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  const locale = getLocale();

  const sidebar = (
    <aside className="dashboard-sidebar sticky top-0 z-30 hidden h-[calc(100vh-3.5rem)] w-56 shrink-0 flex-col py-6 pl-4 pr-2 lg:flex">
      <div className="dashboard-sidebar__title mb-4 px-2 text-xs font-semibold uppercase tracking-wider">
        {m(locale, "admin.ownerRequestsNavTitle")}
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 text-sm">
        <Link href="/dashboard/owner-requests" className="dashboard-sidebar__link rounded-xl px-3 py-2.5 font-medium">
          {m(locale, "admin.ownerRequestsNavAll")}
        </Link>
        <Link
          href="/dashboard/owner-requests?status=PENDING"
          className="dashboard-sidebar__link rounded-xl px-3 py-2.5 font-medium"
        >
          {m(locale, "admin.ownerRequestsNavPending")}
        </Link>
        <Link href="/dashboard/admin?section=applications" className="dashboard-sidebar__link rounded-xl px-3 py-2.5 text-slate-500">
          {m(locale, "admin.ownerRequestsNavBack")}
        </Link>
      </nav>
    </aside>
  );

  return <DashboardShell sidebar={sidebar}>{children}</DashboardShell>;
}
