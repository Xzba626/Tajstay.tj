import type { Locale } from "@/lib/i18n/locale";
import { AMENITY_CATEGORIES } from "./amenities";

type L10n = Record<Locale, string>;

/** Stable amenity ids + legacy aliases from seed / old room JSON */
export const AMENITY_LABELS: Record<string, L10n> = {
  wifi: { ru: "Wi‑Fi", tg: "Wi‑Fi", en: "Wi‑Fi" },
  ac: { ru: "Кондиционер", tg: "Кондиционер", en: "Air conditioning" },
  heating: { ru: "Отопление", tg: "Гармоиш", en: "Heating" },
  tv: { ru: "Телевизор", tg: "Телевизор", en: "TV" },
  fridge: { ru: "Холодильник", tg: "Яхдон", en: "Fridge" },
  desk: { ru: "Рабочий стол", tg: "Мизи кор", en: "Desk" },
  private_bath: { ru: "Собственный санузел", tg: "Ҳаммоми шахсӣ", en: "Private bathroom" },
  shower: { ru: "Душ", tg: "Душ", en: "Shower" },
  bathtub: { ru: "Ванна", tg: "Ванна", en: "Bathtub" },
  towels: { ru: "Полотенца", tg: "Рӯймол", en: "Towels" },
  hairdryer: { ru: "Фен", tg: "Сушандаи мӯй", en: "Hair dryer" },
  toiletries: { ru: "Туалетные принадлежности", tg: "Воситаи ҳигиена", en: "Toiletries" },
  breakfast_included: { ru: "Завтрак включён", tg: "Наҳорӣ дохил", en: "Breakfast included" },
  lunch_available: { ru: "Обед доступен", tg: "Нона ҳазир", en: "Lunch available" },
  dinner_available: { ru: "Ужин доступен", tg: "Шом ҳазир", en: "Dinner available" },
  kitchen: { ru: "Кухня", tg: "Ошхона", en: "Kitchen" },
  kettle: { ru: "Чайник", tg: "Чойник", en: "Kettle" },
  minibar: { ru: "Мини-бар", tg: "Мини-бар", en: "Minibar" },
  crib: { ru: "Детская кроватка", tg: "Гаҳвора", en: "Crib" },
  extra_bed: { ru: "Дополнительная кровать", tg: "Катори иловагӣ", en: "Extra bed" },
  family_room: { ru: "Семейный номер", tg: "Ҳуҷраи оилавӣ", en: "Family room" },
  city_view: { ru: "Вид на город", tg: "Манзараи шаҳр", en: "City view" },
  mountain_view: { ru: "Вид на горы", tg: "Манзараи кӯҳ", en: "Mountain view" },
  balcony: { ru: "Балкон", tg: "Балкон", en: "Balcon" },
  private_entrance: { ru: "Отдельный вход", tg: "Вурудии алоҳида", en: "Private entrance" },
  parking: { ru: "Парковка", tg: "Парковка", en: "Parking" },
  transfer: { ru: "Трансфер", tg: "Трансфер", en: "Transfer" },
  cleaning: { ru: "Уборка", tg: "Тозакунӣ", en: "Cleaning" },
  laundry: { ru: "Прачечная", tg: "Ҷомашӯӣ", en: "Laundry" },
  /** Legacy ids kept in DB / seed */
  breakfast: { ru: "Завтрак", tg: "Наҳорӣ", en: "Breakfast" },
  view: { ru: "Красивый вид", tg: "Манзара", en: "View" },
  pool: { ru: "Бассейн", tg: "Бассейн", en: "Pool" },
  gym: { ru: "Спортзал", tg: "Варзишгоҳ", en: "Gym" },
  spa: { ru: "Спа", tg: "Спа", en: "Spa" },
  restaurant: { ru: "Ресторан", tg: "Ресторан", en: "Restaurant" },
  bar: { ru: "Бар", tg: "Бар", en: "Bar" }
};

const ALIASES: Record<string, string> = {
  breakfast: "breakfast_included"
};

export function normalizeAmenityId(id: string): string {
  const trimmed = id.trim().toLowerCase();
  return ALIASES[trimmed] ?? trimmed;
}

export function getAmenityLabel(locale: Locale, id: string): string {
  const key = normalizeAmenityId(id);
  const labels = AMENITY_LABELS[key] ?? AMENITY_LABELS[id.trim().toLowerCase()];
  if (labels) return labels[locale];
  return id.replace(/_/g, " ");
}

export function getAmenityCategoryLabel(locale: Locale, categoryKey: string): string {
  const cat = AMENITY_CATEGORIES[categoryKey as keyof typeof AMENITY_CATEGORIES];
  return cat?.label[locale] ?? categoryKey;
}

export function formatAmenitiesComma(locale: Locale, ids: string[]): string {
  return ids.map((id) => getAmenityLabel(locale, id)).join(", ");
}
