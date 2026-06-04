/** Normalize city names for TajStay hotel.city matching. */
const ALIASES: Record<string, string> = {
  dushanbe: "dushanbe",
  dushanbeh: "dushanbe",
  душанбе: "dushanbe",
  duşanbe: "dushanbe",
  khujand: "khujand",
  худжанд: "khujand",
  хуҷанд: "khujand",
  бохтар: "bokhtar",
  bokhtar: "bokhtar",
  kurgan: "bokhtar",
  penjikent: "penjikent",
  panjakent: "penjikent",
  пенджикент: "penjikent",
  khorog: "khorog",
  horog: "khorog",
  хорог: "khorog",
  isfara: "isfara",
  исфара: "isfara",
  istaravshan: "istaravshan",
  истаравшан: "istaravshan",
  badakhshan: "khorog",
  gbao: "khorog"
};

export function normalizeCityKey(city: string): string {
  const raw = city.trim().toLowerCase();
  return ALIASES[raw] ?? raw.replace(/\s+/g, " ");
}

export function citiesMatch(a: string, b: string): boolean {
  const ka = normalizeCityKey(a);
  const kb = normalizeCityKey(b);
  if (!ka || !kb) return false;
  return ka === kb || ka.includes(kb) || kb.includes(ka);
}
