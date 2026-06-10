import { prisma } from "@/lib/prisma";

const DEFAULT_TYPES = [
  { code: "APARTMENT", nameRu: "Квартира", nameTg: "Манзил", nameEn: "Apartment", icon: "building-2", sortOrder: 1 },
  { code: "HOUSE", nameRu: "Дом", nameTg: "Хона", nameEn: "House", icon: "home", sortOrder: 2 },
  { code: "VILLA", nameRu: "Вилла", nameTg: "Вилла", nameEn: "Villa", icon: "castle", sortOrder: 3 },
  { code: "HOTEL", nameRu: "Отель", nameTg: "Меҳмонхона", nameEn: "Hotel", icon: "hotel", sortOrder: 4 },
  { code: "HOSTEL", nameRu: "Хостел", nameTg: "Ҳостел", nameEn: "Hostel", icon: "bed-single", sortOrder: 5 },
  { code: "GUESTHOUSE", nameRu: "Гестхаус", nameTg: "Гестхаус", nameEn: "Guesthouse", icon: "house", sortOrder: 6 },
  { code: "SANATORIUM", nameRu: "Санаторий", nameTg: "Санаторий", nameEn: "Sanatorium", icon: "heart-pulse", sortOrder: 7 },
  { code: "YURT", nameRu: "Юрта", nameTg: "Юрт", nameEn: "Yurt", icon: "tent", sortOrder: 8 },
  { code: "ECO", nameRu: "Эко-дом", nameTg: "Эко-хона", nameEn: "Eco house", icon: "trees", sortOrder: 9 }
] as const;

export async function ensurePropertyTypesSeeded() {
  for (const row of DEFAULT_TYPES) {
    await prisma.propertyType.upsert({
      where: { code: row.code },
      create: { ...row, isActive: true },
      update: {
        nameRu: row.nameRu,
        nameTg: row.nameTg,
        nameEn: row.nameEn,
        icon: row.icon,
        sortOrder: row.sortOrder
      }
    });
  }
}

export async function resolvePropertyTypeId(input: { propertyTypeId?: string | null; propertyTypeCode?: string | null }) {
  if (input.propertyTypeId?.trim()) {
    const byId = await prisma.propertyType.findUnique({ where: { id: input.propertyTypeId.trim() } });
    if (byId?.isActive) return byId;
  }
  const code = (input.propertyTypeCode ?? "HOTEL").trim().toUpperCase();
  const byCode = await prisma.propertyType.findUnique({ where: { code } });
  if (byCode) return byCode;
  await ensurePropertyTypesSeeded();
  return prisma.propertyType.findUnique({ where: { code: "HOTEL" } });
}
