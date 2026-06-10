import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth/requireAdmin";
import { forbiddenJson } from "@/lib/auth/apiResponses";

const createSchema = z.object({
  code: z.string().min(1).max(32),
  nameRu: z.string().min(1).max(120),
  nameTg: z.string().min(1).max(120),
  nameEn: z.string().min(1).max(120),
  icon: z.string().max(64).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional()
});

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return forbiddenJson();

  const types = await prisma.propertyType.findMany({
    orderBy: [{ sortOrder: "asc" }, { nameRu: "asc" }],
    include: { _count: { select: { hotels: true } } }
  });
  return NextResponse.json({ types });
}

export async function POST(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return forbiddenJson();

  const body = await req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const code = parsed.data.code.trim().toUpperCase();
  const maxOrder = await prisma.propertyType.aggregate({ _max: { sortOrder: true } });

  try {
    const created = await prisma.propertyType.create({
      data: {
        code,
        nameRu: parsed.data.nameRu.trim(),
        nameTg: parsed.data.nameTg.trim(),
        nameEn: parsed.data.nameEn.trim(),
        icon: parsed.data.icon?.trim() || null,
        isActive: parsed.data.isActive ?? true,
        sortOrder: parsed.data.sortOrder ?? (maxOrder._max.sortOrder ?? 0) + 1
      }
    });
    return NextResponse.json({ ok: true, type: created });
  } catch {
    return NextResponse.json({ error: "Code already exists" }, { status: 409 });
  }
}
