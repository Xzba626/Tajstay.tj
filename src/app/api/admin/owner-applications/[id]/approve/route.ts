import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth/requireAdmin";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { OWNER_APPLICATION_STATUS } from "@/lib/domain/booking";
import { publicUrl } from "@/lib/http/publicOrigin";
import { createNotification } from "@/lib/notifications/create";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";

function wantsJson(req: NextRequest): boolean {
  const accept = req.headers.get("accept") ?? "";
  return accept.includes("application/json") || req.headers.get("x-requested-with") === "XMLHttpRequest";
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminUser();
  if (!admin) return forbiddenJson();

  const id = Number(params.id);
  if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const application = await prisma.ownerApplication.findUnique({ where: { id }, include: { user: true } });
  if (!application) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (application.status !== OWNER_APPLICATION_STATUS.PENDING) {
    return NextResponse.json({ error: "Заявка уже обработана" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.ownerApplication.update({
      where: { id },
      data: {
        status: OWNER_APPLICATION_STATUS.APPROVED,
        reviewedAt: new Date(),
        reviewedById: admin.id,
        comment: null
      }
    }),
    prisma.user.update({
      where: { id: application.userId },
      data: { role: "OWNER" }
    })
  ]);

  const locale = getLocale();
  await createNotification({
    userId: application.userId,
    type: "OWNER_APPLICATION_APPROVED",
    title: m(locale, "notifications.OWNER_APPLICATION_APPROVED"),
    message: m(locale, "notifications.ownerApprovedBody"),
    link: "/dashboard/owner?onboarding=1"
  });

  if (wantsJson(req)) {
    return NextResponse.json({ ok: true, role: "OWNER", redirect: "/dashboard/owner?onboarding=1" });
  }
  return NextResponse.redirect(publicUrl(req, "/dashboard/admin?section=applications"));
}
