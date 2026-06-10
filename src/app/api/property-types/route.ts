import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensurePropertyTypesSeeded } from "@/lib/propertyTypes/seed";

export async function GET() {
  await ensurePropertyTypesSeeded();
  const types = await prisma.propertyType.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { nameRu: "asc" }]
  });
  return NextResponse.json({ types });
}
