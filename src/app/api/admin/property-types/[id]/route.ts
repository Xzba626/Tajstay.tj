import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth/requireAdmin";
import { forbiddenJson } from "@/lib/auth/apiResponses";

const updateSchema = z.object({
  code: z.string().min(1).max(32).optional(),
  nameRu: z.string().min(1).max(120).optional(),
  nameTg: z.string().min(1).max(120).optional(),
  nameEn: z.string().min(1).max(120).optional(),
  icon: z.string().max(64).nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional()
});

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminUser();
  if (!admin) return forbiddenJson();

  const body = await req.json().catch(() => ({}));
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const data = {
    ...parsed.data,
    code: parsed.data.code?.trim().toUpperCase(),
    nameRu: parsed.data.nameRu?.trim(),
    nameTg: parsed.data.nameTg?.trim(),
    nameEn: parsed.data.nameEn?.trim(),
    icon: parsed.data.icon === undefined ? undefined : parsed.data.icon?.trim() || null
  };

  try {
    const updated = await prisma.propertyType.update({
      where: { id: params.id },
      data
    });
    return NextResponse.json({ ok: true, type: updated });
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 400 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminUser();
  if (!admin) return forbiddenJson();

  const count = await prisma.hotel.count({ where: { propertyTypeId: params.id } });
  if (count > 0) {
    return NextResponse.json(
      { error: `Нельзя удалить: ${count} объект(ов) используют этот тип` },
      { status: 409 }
    );
  }

  await prisma.propertyType.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
