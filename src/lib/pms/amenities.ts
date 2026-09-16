/** Categorized amenities for RoomType (category SoT). IDs are stable; UI uses amenityLabel(). */
export const AMENITY_CATEGORIES = {
  basics: {
    label: { ru: "Основные", tg: "Асосӣ", en: "Basics" },
    items: ["wifi", "ac", "heating", "tv"] as const
  },
  comfort: {
    label: { ru: "Комфорт", tg: "Қулайӣ", en: "Comfort" },
    items: ["fridge", "desk", "balcony", "private_entrance"] as const
  },
  bathroom: {
    label: { ru: "Ванная", tg: "Ҳаммом", en: "Bathroom" },
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
    items: ["city_view", "mountain_view"] as const
  },
  services: {
    label: { ru: "Дополнительно", tg: "Иловагӣ", en: "Extra" },
    items: ["parking", "transfer", "cleaning", "laundry"] as const
  }
} as const;

export const AMENITY_LABELS: Record<string, { ru: string; tg: string; en: string }> = {
  wifi: { ru: "Wi-Fi", tg: "Wi-Fi", en: "Wi-Fi" },
  ac: { ru: "Кондиционер", tg: "Кондитсионер", en: "Air conditioning" },
  heating: { ru: "Отопление", tg: "Гармкунӣ", en: "Heating" },
  tv: { ru: "Телевизор", tg: "Телевизор", en: "TV" },
  fridge: { ru: "Холодильник", tg: "Яхдон", en: "Fridge" },
  desk: { ru: "Рабочий стол", tg: "Мизи корӣ", en: "Desk" },
  balcony: { ru: "Балкон", tg: "Балкон", en: "Balcony" },
  private_entrance: { ru: "Отдельный вход", tg: "Даромадгоҳи алоҳида", en: "Private entrance" },
  private_bath: { ru: "Своя ванная", tg: "Ҳаммоми шахсӣ", en: "Private bathroom" },
  shower: { ru: "Душ", tg: "Душ", en: "Shower" },
  bathtub: { ru: "Ванна", tg: "Ванна", en: "Bathtub" },
  towels: { ru: "Полотенца", tg: "Дастмолҳо", en: "Towels" },
  hairdryer: { ru: "Фен", tg: "Фен", en: "Hairdryer" },
  toiletries: { ru: "Туалетные принадлежности", tg: "Лозимаҳои ҳаммом", en: "Toiletries" },
  breakfast_included: { ru: "Завтрак включён", tg: "Наҳорӣ дохил аст", en: "Breakfast included" },
  lunch_available: { ru: "Обед", tg: "Пешобед", en: "Lunch available" },
  dinner_available: { ru: "Ужин", tg: "Шом", en: "Dinner available" },
  kitchen: { ru: "Кухня", tg: "Ошхона", en: "Kitchen" },
  kettle: { ru: "Чайник", tg: "Чойник", en: "Kettle" },
  minibar: { ru: "Мини-бар", tg: "Мини-бар", en: "Minibar" },
  crib: { ru: "Детская кроватка", tg: "Кати кӯдак", en: "Crib" },
  extra_bed: { ru: "Доп. кровать", tg: "Кати иловагӣ", en: "Extra bed" },
  family_room: { ru: "Семейный номер", tg: "Хонаи оилавӣ", en: "Family room" },
  city_view: { ru: "Вид на город", tg: "Манзараи шаҳр", en: "City view" },
  mountain_view: { ru: "Вид на горы", tg: "Манзараи кӯҳ", en: "Mountain view" },
  parking: { ru: "Парковка", tg: "Таваққуфгоҳ", en: "Parking" },
  transfer: { ru: "Трансфер", tg: "Трансфер", en: "Transfer" },
  cleaning: { ru: "Уборка", tg: "Тозакунӣ", en: "Cleaning" },
  laundry: { ru: "Прачечная", tg: "Ҷомашӯӣ", en: "Laundry" }
};

export function amenityLabel(locale: "ru" | "tg" | "en", id: string): string {
  const row = AMENITY_LABELS[id];
  if (!row) return id.replace(/_/g, " ");
  return row[locale] ?? row.ru;
}

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

export const CATEGORY_NAME_SUGGESTIONS = ["Стандарт", "Улучшенный", "Полулюкс", "Люкс", "Семейный"] as const;
