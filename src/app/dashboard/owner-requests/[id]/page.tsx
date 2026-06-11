import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { parseOwnerApplicationMeta } from "@/lib/owner/applicationMeta";
import { listOwnerRequestFileTypes } from "@/lib/owner/ownerRequestFiles";
import { OwnerRequestDetailPanel } from "@/components/admin/OwnerRequestDetailPanel";
import { getLocale } from "@/lib/i18n/get-locale";
import { formatBookingStatus } from "@/lib/i18n/bookingStatus";
import { m } from "@/lib/i18n/messages";

type Props = { params: { id: string } };

export default async function OwnerRequestDetailPage({ params }: Props) {
  await requireAdmin();
  const locale = getLocale();

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
  const dateLocale = locale === "en" ? "en-GB" : locale === "tg" ? "tg-TJ" : "ru-RU";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/dashboard/owner-requests" className="text-sm font-medium text-emerald-700 hover:underline">
          {m(locale, "admin.ownerRequestsBack")}
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">
          {m(locale, "admin.applications")} #{app.id}
        </h1>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">{m(locale, "admin.ownerRequestsFullName")}</dt>
            <dd className="font-medium text-slate-900">{app.fullName}</dd>
          </div>
          <div>
            <dt className="text-slate-500">{m(locale, "profile.phone")}</dt>
            <dd className="font-medium text-slate-900">{app.phone}</dd>
          </div>
          <div>
            <dt className="text-slate-500">{m(locale, "profile.email")}</dt>
            <dd className="font-medium text-slate-900">{app.email}</dd>
          </div>
          <div>
            <dt className="text-slate-500">{m(locale, "admin.ownerRequestsObject")}</dt>
            <dd className="font-medium text-slate-900">{app.businessName}</dd>
          </div>
          <div>
            <dt className="text-slate-500">{m(locale, "admin.address")}</dt>
            <dd className="font-medium text-slate-900">{app.address || meta?.address || "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">{m(locale, "admin.ownerRequestsInn")}</dt>
            <dd className="font-medium text-slate-900">{app.inn || "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">{m(locale, "admin.ownerRequestsUser")}</dt>
            <dd className="font-medium text-slate-900">
              {app.user.name} (id {app.userId})
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">{m(locale, "admin.ownerRequestsSubmitted")}</dt>
            <dd className="font-medium text-slate-900">{app.createdAt.toLocaleString(dateLocale)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">{m(locale, "admin.ownerRequestsStatusLabel")}</dt>
            <dd className="font-medium text-slate-900">{formatBookingStatus(locale, app.status)}</dd>
          </div>
          {meta?.city ? (
            <div>
              <dt className="text-slate-500">{m(locale, "admin.ownerRequestsCity")}</dt>
              <dd className="font-medium text-slate-900">{meta.city}</dd>
            </div>
          ) : null}
          {app.reviewedAt ? (
            <div>
              <dt className="text-slate-500">{m(locale, "admin.ownerRequestsReviewed")}</dt>
              <dd className="font-medium text-slate-900">
                {app.reviewedAt.toLocaleString(dateLocale)}
                {app.reviewedBy ? ` · ${app.reviewedBy.name}` : ""}
              </dd>
            </div>
          ) : null}
          {app.comment ? (
            <div className="sm:col-span-2">
              <dt className="text-slate-500">{m(locale, "admin.ownerRequestsAdminComment")}</dt>
              <dd className="font-medium text-slate-900">{app.comment}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      <OwnerRequestDetailPanel
        locale={locale}
        applicationId={app.id}
        status={app.status}
        availableFileTypes={availableFileTypes}
      />
    </div>
  );
}
