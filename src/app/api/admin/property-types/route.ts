import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth/requireAdmin";

const createSchema = z.object({
  code: z.string().min(1).max(32).regex(/^[A-Z0-9_]+$/i),
  nameRu: z.string().min(1).max(120),
  nameTg: z.string().min(1).max(120),
  nameEn: z.string().min(1).max(120),
  icon: z.string().max(64).optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional()
});

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rows = await prisma.propertyType.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { hotels: true } } }
  });

  return NextResponse.json({ data: rows });
}

export async function POST(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const maxOrder = await prisma.propertyType.aggregate({ _max: { sortOrder: true } });
  const sortOrder = parsed.data.sortOrder ?? (maxOrder._max.sortOrder ?? 0) + 1;

  try {
    const row = await prisma.propertyType.create({
      data: {
        code: parsed.data.code.toUpperCase(),
        nameRu: parsed.data.nameRu,
        nameTg: parsed.data.nameTg,
        nameEn: parsed.data.nameEn,
        icon: parsed.data.icon ?? null,
        isActive: parsed.data.isActive ?? true,
        sortOrder
      }
    });
    return NextResponse.json({ data: row }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Код уже существует" }, { status: 409 });
  }
}
