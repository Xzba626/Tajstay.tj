import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/auth/requireAdmin";
import { forbiddenJson } from "@/lib/auth/apiResponses";

const schema = z.object({
  order: z.array(z.object({ id: z.string(), sortOrder: z.number().int() }))
});

export async function PUT(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return forbiddenJson();

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  await prisma.$transaction(
    parsed.data.order.map((row) =>
      prisma.propertyType.update({
        where: { id: row.id },
        data: { sortOrder: row.sortOrder }
      })
    )
  );

  return NextResponse.json({ ok: true });
}
