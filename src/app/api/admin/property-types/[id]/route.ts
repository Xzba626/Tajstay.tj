import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth/requireAdmin";

const updateSchema = z.object({
  code: z.string().min(1).max(32).regex(/^[A-Z0-9_]+$/i).optional(),
  nameRu: z.string().min(1).max(120).optional(),
  nameTg: z.string().min(1).max(120).optional(),
  nameEn: z.string().min(1).max(120).optional(),
  icon: z.string().max(64).optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional()
});

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const data = {
    ...parsed.data,
    code: parsed.data.code ? parsed.data.code.toUpperCase() : undefined
  };

  try {
    const row = await prisma.propertyType.update({
      where: { id: params.id },
      data
    });
    return NextResponse.json({ data: row });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const hotelsCount = await prisma.hotel.count({ where: { propertyTypeId: params.id } });
  if (hotelsCount > 0) {
    return NextResponse.json(
      { error: `Нельзя удалить: ${hotelsCount} объект(ов) используют этот тип` },
      { status: 409 }
    );
  }

  try {
    await prisma.propertyType.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
