export const PROPERTY_TYPES = ["HOTEL", "HOSTEL", "GUESTHOUSE", "APARTMENT", "ECO"] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];
export type PropertyTypeFilter = "ANY" | PropertyType | "GUEST_HOUSE" | "ECO_HOUSE";

const PROPERTY_TYPE_ALIASES: Record<string, PropertyType> = {
  HOTEL: "HOTEL",
  HOSTEL: "HOSTEL",
  GUESTHOUSE: "GUESTHOUSE",
  GUEST_HOUSE: "GUESTHOUSE",
  APARTMENT: "APARTMENT",
  ECO: "ECO",
  ECO_HOUSE: "ECO"
};

export function normalizePropertyType(input: unknown): PropertyType | null {
  const key = String(input ?? "")
    .trim()
    .toUpperCase()
    .replace(/[-\s]+/g, "_");

  return PROPERTY_TYPE_ALIASES[key] ?? null;
}
