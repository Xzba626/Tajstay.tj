import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { parseOwnerApplicationMeta } from "@/lib/owner/applicationMeta";
import { listOwnerRequestFileTypes } from "@/lib/owner/ownerRequestFiles";
import { OwnerRequestDetailPanel } from "@/components/admin/OwnerRequestDetailPanel";

type Props = { params: { id: string } };

export default async function OwnerRequestDetailPage({ params }: Props) {
  await requireAdmin();

  const id = Number(params.id);
  if (!id) notFound();

  const app = await prisma.ownerApplication.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, phone: true } },
      reviewedBy: { select: { id: true, name: true } }
    }
  });
  if (!app) notFound();

  const meta = parseOwnerApplicationMeta(app.applicationMeta);
  const availableFileTypes = listOwnerRequestFileTypes(app);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/dashboard/owner-requests" className="text-sm font-medium text-emerald-700 hover:underline">
          ← К списку
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Заявка #{app.id}</h1>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">ФИО</dt>
            <dd className="font-medium text-slate-900">{app.fullName}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Телефон</dt>
            <dd className="font-medium text-slate-900">{app.phone}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Email</dt>
            <dd className="font-medium text-slate-900">{app.email}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Объект</dt>
            <dd className="font-medium text-slate-900">{app.businessName}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Адрес</dt>
            <dd className="font-medium text-slate-900">{app.address || meta?.address || "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">ИНН</dt>
            <dd className="font-medium text-slate-900">{app.inn || "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Пользователь</dt>
            <dd className="font-medium text-slate-900">
              {app.user.name} (id {app.userId})
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Дата подачи</dt>
            <dd className="font-medium text-slate-900">{app.createdAt.toLocaleString("ru-RU")}</dd>
          </div>
          {meta?.city ? (
            <div>
              <dt className="text-slate-500">Город</dt>
              <dd className="font-medium text-slate-900">{meta.city}</dd>
            </div>
          ) : null}
          {app.reviewedAt ? (
            <div>
              <dt className="text-slate-500">Рассмотрена</dt>
              <dd className="font-medium text-slate-900">
                {app.reviewedAt.toLocaleString("ru-RU")}
                {app.reviewedBy ? ` · ${app.reviewedBy.name}` : ""}
              </dd>
            </div>
          ) : null}
          {app.comment ? (
            <div className="sm:col-span-2">
              <dt className="text-slate-500">Комментарий админа</dt>
              <dd className="font-medium text-slate-900">{app.comment}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      <OwnerRequestDetailPanel applicationId={app.id} status={app.status} availableFileTypes={availableFileTypes} />
    </div>
  );
}
