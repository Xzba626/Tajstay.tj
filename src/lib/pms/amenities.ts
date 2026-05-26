/** Categorized amenities for RoomType / PhysicalRoom custom overrides */
export const AMENITY_CATEGORIES = {
  comfort: {
    label: { ru: "Комфорт", tg: "Қулайӣ", en: "Comfort" },
    items: ["wifi", "ac", "heating", "tv", "fridge", "desk"] as const
  },
  bathroom: {
    label: { ru: "Санузел", tg: "Ҳаммом", en: "Bathroom" },
    items: ["private_bath", "shower", "bathtub", "towels", "hairdryer", "toiletries"] as const
  },
  meals: {
    label: { ru: "Питание", tg: "Таом", en: "Meals" },
    items: ["breakfast_included", "lunch_available", "dinner_available", "kitchen", "kettle", "minibar"] as const
  },
  family: {
    label: { ru: "Семья", tg: "Оила", en: "Family" },
    items: ["crib", "extra_bed", "family_room"] as const
  },
  view: {
    label: { ru: "Вид", tg: "Манзара", en: "View" },
    items: ["city_view", "mountain_view", "balcony", "private_entrance"] as const
  },
  services: {
    label: { ru: "Услуги", tg: "Хизматрасонӣ", en: "Services" },
    items: ["parking", "transfer", "cleaning", "laundry"] as const
  }
} as const;

export const BED_TYPES = ["double", "twin", "sofa", "bunk", "extra_bed"] as const;

export type BedType = (typeof BED_TYPES)[number];

export function parseAmenitiesJson(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function amenitiesToJson(list: string[]): string {
  return JSON.stringify([...new Set(list.map((s) => s.trim()).filter(Boolean))]);
}
