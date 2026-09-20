import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/requireAdmin";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { prisma } from "@/lib/prisma";
import { adminNotificationCleanupWhere } from "@/lib/notifications/unread";
import { publicUrl } from "@/lib/http/publicOrigin";

export async function POST(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return forbiddenJson();

  const form = await req.formData();
  const days = Number(form.get("days") || 30);
  if (!Number.isFinite(days) || days < 1 || days > 3650) {
    return NextResponse.json({ error: "Invalid days" }, { status: 400 });
  }

  const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // SECURITY: this previously ran `deleteMany({ where: { createdAt: { lt: threshold } } })` —
  // a platform-wide purge of EVERY user's notifications, triggered from a button that sits inside
  // the Admin Notifications list. Since that list, its pagination count, the unread badge and the
  // Dashboard attention count are all scoped by `adminNotificationWhere`, the destructive action
  // under them must use the same predicate: this admin's own operational notifications only.
  // Composed (not re-declared) so the type allowlist can never drift from the read paths.
  // A genuine platform-wide retention purge, if ever needed, belongs in a separately named
  // maintenance mechanism — not as a side effect of this UI button.
  // adminNotificationCleanupWhere = adminNotificationWhere(admin.id) + createdAt < threshold.
  await prisma.notification.deleteMany({
    where: adminNotificationCleanupWhere(admin.id, threshold)
  });

  return NextResponse.redirect(publicUrl(req, "/dashboard/admin?section=notifications"));
}
