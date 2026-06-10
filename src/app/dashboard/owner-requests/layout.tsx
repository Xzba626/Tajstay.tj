import type { ReactNode } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/ds";
import { requireAdmin } from "@/lib/auth/requireAdmin";

export default async function OwnerRequestsLayout({ children }: { children: ReactNode }) {
  await requireAdmin();

  const sidebar = (
    <aside className="dashboard-sidebar sticky top-0 z-30 hidden h-[calc(100vh-3.5rem)] w-56 shrink-0 flex-col py-6 pl-4 pr-2 lg:flex">
      <div className="dashboard-sidebar__title mb-4 px-2 text-xs font-semibold uppercase tracking-wider">
        Заявки владельцев
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 text-sm">
        <Link href="/dashboard/owner-requests" className="dashboard-sidebar__link rounded-xl px-3 py-2.5 font-medium">
          Все заявки
        </Link>
        <Link
          href="/dashboard/owner-requests?status=PENDING"
          className="dashboard-sidebar__link rounded-xl px-3 py-2.5 font-medium"
        >
          На рассмотрении
        </Link>
        <Link href="/dashboard/admin?section=applications" className="dashboard-sidebar__link rounded-xl px-3 py-2.5 text-slate-500">
          ← Админ-панель
        </Link>
      </nav>
    </aside>
  );

  return <DashboardShell sidebar={sidebar}>{children}</DashboardShell>;
}
