import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth/requireAdmin";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { listOwnerRequestFileTypes } from "@/lib/owner/ownerRequestFiles";
import { decryptOwnerApplicationField } from "@/lib/owner/ownerApplicationPii";

export const dynamic = "force-dynamic";

const LIST_SELECT = {
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
  passportFront: false,
  passportBack: false,
  selfieWithDoc: false,
  propertyDoc: false,
  applicationMeta: false,
  documentUrl: false,
  user: { select: { id: true, name: true, phone: true } }
} as const;

/** Список заявок владельца (ADMIN). Без путей к конфиденциальным файлам. */
export async function GET(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return forbiddenJson();

  const status = req.nextUrl.searchParams.get("status")?.trim().toUpperCase();
  const where = status && ["PENDING", "APPROVED", "REJECTED"].includes(status) ? { status } : {};

  const rows = await prisma.ownerApplication.findMany({
    where,
    select: LIST_SELECT,
    orderBy: { createdAt: "desc" }
  });

  const ids = rows.map((r) => r.id);
  const fullRows = ids.length
    ? await prisma.ownerApplication.findMany({ where: { id: { in: ids } } })
    : [];
  const fileTypesById = new Map(fullRows.map((r) => [r.id, listOwnerRequestFileTypes(r)]));

  return NextResponse.json({
    data: rows.map((row) => ({
      ...row,
      fullName: decryptOwnerApplicationField(row.fullName) ?? row.fullName,
      phone: decryptOwnerApplicationField(row.phone) ?? row.phone,
      email: decryptOwnerApplicationField(row.email) ?? row.email,
      address: decryptOwnerApplicationField(row.address) ?? row.address,
      businessName: decryptOwnerApplicationField(row.businessName) ?? row.businessName,
      inn: decryptOwnerApplicationField(row.inn) ?? row.inn,
      adminComment: row.comment,
      comment: undefined,
      availableFileTypes: fileTypesById.get(row.id) ?? []
    }))
  });
}
