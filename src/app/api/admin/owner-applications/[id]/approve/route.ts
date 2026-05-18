import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth/requireAdmin";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { OWNER_APPLICATION_STATUS } from "@/lib/domain/booking";
import { publicUrl } from "@/lib/http/publicOrigin";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
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

  await prisma.notification.create({
    data: {
      userId: application.userId,
      bookingId: null,
      type: "OWNER_APPLICATION_APPROVED",
      isRead: false
    }
  });

  return NextResponse.redirect(publicUrl(_req, "/dashboard/admin"));
}
