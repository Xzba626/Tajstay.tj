import { prisma } from "@/lib/prisma";

export const DEFAULT_PROPERTY_TYPES = [
  { code: "APARTMENT", nameRu: "Квартира", nameTg: "Манзил", nameEn: "Apartment", icon: "building-2", sortOrder: 1 },
  { code: "HOUSE", nameRu: "Дом", nameTg: "Хона", nameEn: "House", icon: "home", sortOrder: 2 },
  { code: "VILLA", nameRu: "Вилла", nameTg: "Вилла", nameEn: "Villa", icon: "castle", sortOrder: 3 },
  { code: "HOTEL", nameRu: "Отель", nameTg: "Меҳмонхона", nameEn: "Hotel", icon: "hotel", sortOrder: 4 },
  { code: "HOSTEL", nameRu: "Хостел", nameTg: "Ҳостел", nameEn: "Hostel", icon: "bed-single", sortOrder: 5 },
  { code: "GUESTHOUSE", nameRu: "Гестхаус", nameTg: "Гестхаус", nameEn: "Guesthouse", icon: "house", sortOrder: 6 },
  { code: "SANATORIUM", nameRu: "Санаторий", nameTg: "Санаторий", nameEn: "Sanatorium", icon: "heart-pulse", sortOrder: 7 },
  { code: "YURT", nameRu: "Юрта", nameTg: "Юрт", nameEn: "Yurt", icon: "tent", sortOrder: 8 },
  { code: "ECO", nameRu: "Эко-дом", nameTg: "Хонаи экологӣ", nameEn: "Eco house", icon: "leaf", sortOrder: 9 }
] as const;

const STABLE_IDS: Record<string, string> = {
  APARTMENT: "pt_apartment",
  HOUSE: "pt_house",
  VILLA: "pt_villa",
  HOTEL: "pt_hotel",
  HOSTEL: "pt_hostel",
  GUESTHOUSE: "pt_guesthouse",
  SANATORIUM: "pt_sanatorium",
  YURT: "pt_yurt",
  ECO: "pt_eco"
};

/** Idempotent upsert of default property type catalog. */
export async function seedPropertyTypes() {
  for (const row of DEFAULT_PROPERTY_TYPES) {
    await prisma.propertyType.upsert({
      where: { code: row.code },
      create: {
        id: STABLE_IDS[row.code],
        code: row.code,
        nameRu: row.nameRu,
        nameTg: row.nameTg,
        nameEn: row.nameEn,
        icon: row.icon,
        sortOrder: row.sortOrder,
        isActive: true
      },
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

export async function resolvePropertyTypeId(codeOrId: string): Promise<string | null> {
  const trimmed = codeOrId.trim();
  if (!trimmed) return null;
  const byId = await prisma.propertyType.findUnique({ where: { id: trimmed }, select: { id: true } });
  if (byId) return byId.id;
  const byCode = await prisma.propertyType.findUnique({ where: { code: trimmed.toUpperCase() }, select: { id: true } });
  return byCode?.id ?? null;
}

/** Maps legacy search filter codes to PropertyType.code */
export function normalizePropertyTypeFilterCode(filter: string): string {
  const upper = filter.toUpperCase();
  if (upper === "GUEST_HOUSE") return "GUESTHOUSE";
  if (upper === "ECO_HOUSE") return "ECO";
  return upper;
}
