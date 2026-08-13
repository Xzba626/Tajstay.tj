import type { Locale } from "./locale";
import { m } from "./messages";

function ruPluralForm(count: number): "one" | "few" | "many" {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "one";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "few";
  return "many";
}

type CountGroup = "night" | "day" | "people";

const KEY_MAP: Record<CountGroup, { one: string; few: string; many: string; count: string }> = {
  night: {
    one: "tripsHub.nightOne",
    few: "tripsHub.nightFew",
    many: "tripsHub.nightMany",
    count: "tripsHub.nightsCount"
  },
  day: {
    one: "tripsHub.dayOne",
    few: "tripsHub.dayFew",
    many: "tripsHub.dayMany",
    count: "tripsHub.daysCount"
  },
  people: {
    one: "tripsHub.peopleOne",
    few: "tripsHub.peopleFew",
    many: "tripsHub.peopleMany",
    count: "tripsHub.peopleCount"
  }
};

/** Locale-aware count + unit label (nights, days, guests). */
export function formatCountLabel(locale: Locale, count: number, group: CountGroup): string {
  const keys = KEY_MAP[group];
  const n = String(count);

  if (locale === "en" || locale === "tg") {
    if (count === 1) return m(locale, keys.one);
    return m(locale, keys.count, { count: n });
  }

  const form = ruPluralForm(count);
  if (form === "one") return m(locale, keys.one);
  if (form === "few") return m(locale, keys.few, { count: n });
  return m(locale, keys.many, { count: n });
}
