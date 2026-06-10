import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLocale } from "@/lib/i18n/get-locale";

export async function GET() {
  const locale = getLocale();
  const rows = await prisma.propertyType.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" }
  });

  const nameKey = locale === "tg" ? "nameTg" : locale === "en" ? "nameEn" : "nameRu";

  return NextResponse.json({
    data: rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row[nameKey],
      icon: row.icon,
      sortOrder: row.sortOrder
    }))
  });
}
