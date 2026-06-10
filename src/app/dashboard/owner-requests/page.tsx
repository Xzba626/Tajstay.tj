import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { OWNER_APPLICATION_STATUS } from "@/lib/domain/booking";
import { listOwnerRequestFileTypes } from "@/lib/owner/ownerRequestFiles";

type Props = { searchParams: { status?: string } };

function statusBadge(status: string) {
  if (status === OWNER_APPLICATION_STATUS.APPROVED) {
    return "bg-emerald-100 text-emerald-800";
  }
  if (status === OWNER_APPLICATION_STATUS.REJECTED) {
    return "bg-red-100 text-red-800";
  }
  return "bg-amber-100 text-amber-900";
}

function statusLabel(status: string) {
  if (status === OWNER_APPLICATION_STATUS.APPROVED) return "Одобрена";
  if (status === OWNER_APPLICATION_STATUS.REJECTED) return "Отклонена";
  return "На рассмотрении";
}

export default async function OwnerRequestsPage({ searchParams }: Props) {
  await requireAdmin();

  const statusFilter = searchParams.status?.trim().toUpperCase();
  const where =
    statusFilter && ["PENDING", "APPROVED", "REJECTED"].includes(statusFilter) ? { status: statusFilter } : {};

  const rows = await prisma.ownerApplication.findMany({
    where,
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Заявки на статус владельца</h1>
          <p className="mt-1 text-sm text-slate-600">Документы доступны только через защищённый API</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <FilterLink href="/dashboard/owner-requests" active={!statusFilter} label="Все" />
          <FilterLink href="/dashboard/owner-requests?status=PENDING" active={statusFilter === "PENDING"} label="Ожидают" />
          <FilterLink href="/dashboard/owner-requests?status=APPROVED" active={statusFilter === "APPROVED"} label="Одобрены" />
          <FilterLink href="/dashboard/owner-requests?status=REJECTED" active={statusFilter === "REJECTED"} label="Отклонены" />
        </div>
      </div>

      {!rows.length ? (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center text-slate-500">
          Заявок нет
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Заявитель</th>
                <th className="px-4 py-3">Телефон</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3">Документы</th>
                <th className="px-4 py-3">Дата</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => {
                const fileCount = listOwnerRequestFileTypes(row).length;
                return (
                  <tr key={row.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-medium text-slate-900">{row.fullName}</td>
                    <td className="px-4 py-3 text-slate-600">{row.phone}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadge(row.status)}`}>
                        {statusLabel(row.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{fileCount} файл(ов)</td>
                    <td className="px-4 py-3 text-slate-500">{row.createdAt.toLocaleString("ru-RU")}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/owner-requests/${row.id}`}
                        className="font-medium text-emerald-700 hover:underline"
                      >
                        Открыть
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FilterLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={`rounded-xl px-3 py-1.5 font-medium ${
        active ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
      }`}
    >
      {label}
    </Link>
  );
}
