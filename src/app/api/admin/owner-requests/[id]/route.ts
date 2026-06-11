import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth/requireAdmin";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { listOwnerRequestFileTypes } from "@/lib/owner/ownerRequestFiles";
import { approveOwnerRequest, rejectOwnerRequest } from "@/lib/owner/ownerRequestReview";
import { parseOwnerApplicationMeta } from "@/lib/owner/applicationMeta";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  adminComment: z.string().max(2000).optional()
});

const DETAIL_SELECT = {
  id: true,
  userId: true,
  fullName: true,
  phone: true,
  address: true,
  inn: true,
  email: true,
  businessName: true,
  status: true,
  comment: true,
  createdAt: true,
  reviewedAt: true,
  reviewedById: true,
  applicationMeta: true,
  passportFront: false,
  passportBack: false,
  selfieWithDoc: false,
  propertyDoc: false,
  documentUrl: false,
  user: { select: { id: true, name: true, phone: true, email: true } },
  reviewedBy: { select: { id: true, name: true } }
} as const;

/** Детали заявки (ADMIN). Файлы — только через /file endpoint. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminUser();
  if (!admin) return forbiddenJson();

  const id = Number(params.id);
  if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const row = await prisma.ownerApplication.findUnique({
    where: { id },
    select: DETAIL_SELECT
  });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const full = await prisma.ownerApplication.findUnique({ where: { id } });
  const meta = parseOwnerApplicationMeta(row.applicationMeta);

  return NextResponse.json({
    data: {
      ...row,
      adminComment: row.comment,
      comment: undefined,
      applicationMeta: meta
        ? {
            city: meta.city,
            propertyType: meta.propertyType,
            propertyDescription: meta.propertyDescription,
            roomCount: meta.roomCount,
            guestCapacity: meta.guestCapacity
          }
        : null,
      availableFileTypes: full ? listOwnerRequestFileTypes(full) : []
    }
  });
}

/** Одобрение / отклонение заявки (ADMIN). */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminUser();
  if (!admin) return forbiddenJson();

  const id = Number(params.id);
  if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const json = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректные данные", details: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.status === "REJECTED" && !parsed.data.adminComment?.trim()) {
    return NextResponse.json({ error: "Нужен комментарий при отказе" }, { status: 400 });
  }

  const result =
    parsed.data.status === "APPROVED"
      ? await approveOwnerRequest(id, admin)
      : await rejectOwnerRequest(id, admin, parsed.data.adminComment ?? "");

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true, status: parsed.data.status });
}
