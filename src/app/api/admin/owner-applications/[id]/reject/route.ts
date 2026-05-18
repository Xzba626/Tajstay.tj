import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth/requireAdmin";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { OWNER_APPLICATION_STATUS } from "@/lib/domain/booking";
import { publicUrl } from "@/lib/http/publicOrigin";

const bodySchema = z.object({
  comment: z.string().min(1).max(2000)
});

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

  await prisma.ownerApplication.update({
    where: { id },
    data: {
      status: OWNER_APPLICATION_STATUS.REJECTED,
      reviewedAt: new Date(),
      reviewedById: admin.id,
      comment: comment.trim()
    }
  });

  await prisma.notification.create({
    data: {
      userId: application.userId,
      bookingId: null,
      type: "OWNER_APPLICATION_REJECTED",
      isRead: false
    }
  });

  return NextResponse.redirect(publicUrl(req, "/dashboard/admin"));
}
