import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth/requireAdmin";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { OWNER_APPLICATION_STATUS } from "@/lib/domain/booking";
import { publicUrl } from "@/lib/http/publicOrigin";
import { createNotification } from "@/lib/notifications/create";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";

const bodySchema = z.object({
  comment: z.string().min(1).max(2000)
});

function wantsJson(req: NextRequest): boolean {
  const accept = req.headers.get("accept") ?? "";
  return accept.includes("application/json") || req.headers.get("x-requested-with") === "XMLHttpRequest";
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminUser();
  if (!admin) return forbiddenJson();

  const id = Number(params.id);
  if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const form = await req.formData().catch(() => null);
  let comment = "";
  if (form) {
    comment = String(form.get("comment") ?? "");
  } else {
    const json = await req.json().catch(() => ({}));
    const p = bodySchema.safeParse(json);
    if (!p.success) return NextResponse.json({ error: "Нужен комментарий" }, { status: 400 });
    comment = p.data.comment;
  }

  if (!comment.trim()) return NextResponse.json({ error: "Нужен комментарий" }, { status: 400 });

  const application = await prisma.ownerApplication.findUnique({ where: { id } });
  if (!application) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (application.status !== OWNER_APPLICATION_STATUS.PENDING) {
    return NextResponse.json({ error: "Заявка уже обработана" }, { status: 400 });
  }

  const trimmed = comment.trim();

  await prisma.ownerApplication.update({
    where: { id },
    data: {
      status: OWNER_APPLICATION_STATUS.REJECTED,
      reviewedAt: new Date(),
      reviewedById: admin.id,
      comment: trimmed
    }
  });

  const locale = getLocale();
  await createNotification({
    userId: application.userId,
    type: "OWNER_APPLICATION_REJECTED",
    title: m(locale, "notifications.OWNER_APPLICATION_REJECTED"),
    message: `${m(locale, "notifications.ownerRejectedBody")}: ${trimmed}`,
    link: "/profile/become-owner"
  });

  if (wantsJson(req)) {
    return NextResponse.json({ ok: true, redirect: "/dashboard/admin?section=applications" });
  }
  return NextResponse.redirect(publicUrl(req, "/dashboard/admin?section=applications"));
}
