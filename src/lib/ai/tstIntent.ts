import { parseAmenitiesJson } from "@/lib/pms/amenities";

export type TstPropertyType = "ANY" | "HOTEL" | "HOSTEL" | "GUEST_HOUSE" | "APARTMENT" | "ECO_HOUSE";

export const TST_CITIES = [
  { canonical: "Dushanbe", aliases: ["dushanbe", "душанбе"] },
  { canonical: "Khujand", aliases: ["khujand", "худжанд", "хуҷанд"] },
  { canonical: "Penjikent", aliases: ["penjikent", "пенджикент", "панҷакент"] },
  { canonical: "Badakhshan", aliases: ["badakhshan", "бадахшан", "khorog", "хорог", "хоруғ"] }
] as const;

export type TstAction =
  | "match"
  | "value"
  | "location"
  | "budget"
  | "best"
  | "view"
  | "quiet"
  | "center"
  | "family"
  | "business"
  | "cheapest"
  | "couple"
  | "compare"
  | "book"
  | "room"
  | "ask"
  | "history"
  | "nl";

export type TstParsedQuery = {
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  guests?: number;
  wifi?: boolean;
  breakfast?: boolean;
  parking?: boolean;
  propertyType?: TstPropertyType;
  ratingMin?: number;
  sortBy?: "POPULAR" | "PRICE_ASC" | "RATING_DESC";
  checkIn?: string;
  checkOut?: string;
  wantsQuiet?: boolean;
  wantsView?: boolean;
  wantsCenter?: boolean;
  wantsNature?: boolean;
  wantsMountain?: boolean;
  wantsRiver?: boolean;
  wantsFamily?: boolean;
  wantsBusiness?: boolean;
  wantsCouple?: boolean;
  wantsCheaper?: boolean;
  wantsSimilar?: boolean;
  wantsBetter?: boolean;
  excludeHotelId?: number;
  referenceHotelId?: number;
  action?: TstAction;
};

export type TstHotel = {
  id: number;
  name: string;
  city: string;
  address?: string | null;
  description?: string | null;
  rating?: number | null;
  propertyType?: string | null;
  rooms?: Array<{
    id?: number;
    title?: string;
    price?: unknown;
    capacity?: number;
    amenities?: string;
    availability?: boolean;
  }>;
};

export type TstReasonKey =
  | "city"
  | "wifi"
  | "breakfast"
  | "parking"
  | "budget"
  | "quiet"
  | "view"
  | "center"
  | "nature"
  | "mountain"
  | "river"
  | "family"
  | "business"
  | "rating"
  | "price"
  | "available";

export type TstMatch = {
  hotel: TstHotel;
  minPrice: number;
  maxCapacity: number;
  amenities: string[];
  reasons: TstReasonKey[];
  availableCount: number;
  rating: number | null;
  matchScore: number;
};

export type TstRoomGroup = {
  title: string;
  count: number;
  minPrice: number;
  capacity: number;
  amenities: string[];
  identical: boolean;
};

export type TstCompareRow = {
  hotelId: number;
  name: string;
  city: string;
  address: string;
  minPrice: number;
  rating: number | null;
  amenities: string[];
  roomsLabel: string;
  availableCount: number;
};

export type TstOutcome =
  | { status: "ok"; matches: TstMatch[]; query: TstParsedQuery }
  | { status: "empty"; query: TstParsedQuery }
  | { status: "insufficient"; query: TstParsedQuery; kind: "quiet" | "view" | "center" | "nature" | "mountain" | "river" };

const MOUNTAIN_KEYS = ["горы", "горам", "горах", "горный", "горн", "mountain", "памир", "холм", "mountain_view"];
const RIVER_KEYS = ["река", "реки", "рекой", "river", "озеро", "озера", "lake"];
const VIEW_KEYS = [...MOUNTAIN_KEYS, ...RIVER_KEYS, "вид на", "пейзаж", "view", "панорама", "city_view"];
const QUIET_KEYS = ["тих", "спокой", "quiet", "уедин"];
const CENTER_KEYS = ["центр", "городск", "downtown", "urban", "city center", "в центре"];
const NATURE_KEYS = ["природ", "nature", "эко", "lodge", "eco"];
const FAMILY_TEXT_KEYS = ["семь", "дет", "family", "kids", "child", "family_room", "crib"];
const BUSINESS_TEXT_KEYS = ["бизнес", "business", "desk", "офис", "conference"];

const PROPERTY_HINTS: Array<{ type: TstPropertyType; keys: string[] }> = [
  { type: "HOSTEL", keys: ["хостел", "hostel"] },
  { type: "GUEST_HOUSE", keys: ["гостев", "guest house", "guest-house"] },
  { type: "APARTMENT", keys: ["апартамент", "квартир", "apartment"] },
  { type: "ECO_HOUSE", keys: ["эко-дом", "eco house", "eco-house"] }
];

function hasKeyword(text: string, keys: string[]) {
  return keys.some((key) => text.includes(key));
}

export function hotelMinPrice(hotel: TstHotel) {
  const prices = (hotel.rooms ?? [])
    .filter((room) => room.availability !== false)
    .map((room) => Number(room.price))
    .filter((price) => Number.isFinite(price) && price > 0);
  return prices.length ? Math.min(...prices) : Number.POSITIVE_INFINITY;
}

export function hotelAmenities(hotel: TstHotel) {
  const set = new Set<string>();
  for (const room of hotel.rooms ?? []) {
    parseAmenitiesJson(room.amenities).forEach((item) => set.add(item.toLowerCase()));
  }
  return [...set];
}

function hotelText(hotel: TstHotel) {
  return `${hotel.name} ${hotel.city} ${hotel.address ?? ""} ${hotel.description ?? ""} ${hotelAmenities(hotel).join(" ")}`.toLowerCase();
}

function availableRooms(hotel: TstHotel) {
  return (hotel.rooms ?? []).filter((room) => room.availability !== false);
}

function maxCapacity(hotel: TstHotel) {
  const caps = availableRooms(hotel)
    .map((room) => Number(room.capacity))
    .filter((n) => Number.isFinite(n) && n > 0);
  return caps.length ? Math.max(...caps) : 0;
}

function storedRating(hotel: TstHotel) {
  const rating = Number(hotel.rating);
  return Number.isFinite(rating) && rating > 0 ? rating : null;
}

export function parseNaturalQuery(raw: string): TstParsedQuery {
  const text = raw.trim().toLowerCase();
  const query: TstParsedQuery = { action: "nl" };
  if (!text) return query;

  for (const city of TST_CITIES) {
    if (text.includes(city.canonical.toLowerCase()) || city.aliases.some((alias) => text.includes(alias))) {
      query.city = city.canonical;
      break;
    }
  }

  const maxMatch = text.match(/(?:до|until|under|max|не дороже|максимум|upto)\s*(\d{2,6})/i);
  if (maxMatch) query.maxPrice = Number(maxMatch[1]);

  const minMatch = text.match(/(?:от|from|min|минимум|не дешевле)\s*(\d{2,6})/i);
  if (minMatch) query.minPrice = Number(minMatch[1]);

  if (query.maxPrice == null) {
    const somoni = text.match(/(\d{2,6})\s*(?:сомони|сомон|tjs|смн)/i);
    if (somoni && /(до|бюджет|недорог|дешев|cheap|budget)/.test(text)) {
      query.maxPrice = Number(somoni[1]);
    }
  }

  const guestsMatch = text.match(/(\d{1,2})\s*(?:гост|человек|чел|guest|people|adult)/i);
  if (guestsMatch) query.guests = Number(guestsMatch[1]);

  if (/(wifi|wi-fi|вай.?фай|интернет)/.test(text)) query.wifi = true;
  if (/(завтрак|breakfast)/.test(text)) query.breakfast = true;
  if (/(парков|parking)/.test(text)) query.parking = true;

  if (hasKeyword(text, QUIET_KEYS)) query.wantsQuiet = true;
  if (hasKeyword(text, VIEW_KEYS)) query.wantsView = true;
  if (hasKeyword(text, CENTER_KEYS)) query.wantsCenter = true;
  if (hasKeyword(text, NATURE_KEYS)) query.wantsNature = true;
  if (hasKeyword(text, MOUNTAIN_KEYS)) query.wantsMountain = true;
  if (hasKeyword(text, RIVER_KEYS)) query.wantsRiver = true;
  if (hasKeyword(text, FAMILY_TEXT_KEYS) || /семейн/.test(text)) query.wantsFamily = true;
  if (hasKeyword(text, BUSINESS_TEXT_KEYS) || /делов/.test(text)) query.wantsBusiness = true;
  if (/(пар|парочк|для двоих|couple|romantic)/.test(text)) query.wantsCouple = true;

  for (const hint of PROPERTY_HINTS) {
    if (hint.keys.some((key) => text.includes(key))) {
      query.propertyType = hint.type;
      break;
    }
  }

  if (query.wantsCouple && query.guests == null) query.guests = 2;
  if (query.wantsFamily && query.guests == null) query.guests = 3;

  if (/(дешев|дешёв|cheaper|lower price|арзон)/.test(text)) query.wantsCheaper = true;
  if (/(похож|similar|same style|шабеҳ|like this)/.test(text)) query.wantsSimilar = true;
  if (/(лучше|better|надёжн|behtar)/.test(text)) query.wantsBetter = true;
  if (/(тише|quieter|оромтар|more quiet)/.test(text)) query.wantsQuiet = true;

  return query;
}

export function parseContextQuery(text: string, ctx: { hotelId?: number; searchDraft?: Partial<TstParsedQuery> }) {
  const parsed = parseNaturalQuery(text);
  const merged: TstParsedQuery = { ...ctx.searchDraft, ...parsed, action: "nl" };

  if (ctx.hotelId) {
    merged.referenceHotelId = ctx.hotelId;
    if (parsed.wantsCheaper || parsed.wantsSimilar || parsed.wantsBetter) {
      merged.excludeHotelId = ctx.hotelId;
    }
  }

  return merged;
}

export function getFollowUp(query: TstParsedQuery): { key: string } | null {
  const needsCity =
    !query.city &&
    (query.maxPrice != null ||
      query.wifi ||
      query.breakfast ||
      query.wantsCenter ||
      query.wantsQuiet ||
      query.wantsView ||
      query.action === "budget" ||
      query.action === "location");

  if (needsCity) return { key: "tstAssistant.followUp.city" };
  if (query.action === "budget" && query.maxPrice == null) return { key: "tstAssistant.followUp.budget" };
  if (query.action === "match" && !query.city && !query.maxPrice && !query.wifi) {
    return { key: "tstAssistant.followUp.freeform" };
  }
  return null;
}

export function applyActionDefaults(action: TstAction, current: TstParsedQuery = {}): TstParsedQuery {
  const next: TstParsedQuery = { ...current, action };

  if (action === "quiet") next.wantsQuiet = true;
  if (action === "view") next.wantsView = true;
  if (action === "center") next.wantsCenter = true;
  if (action === "family") {
    next.wantsFamily = true;
    next.guests = next.guests && next.guests >= 3 ? next.guests : 3;
  }
  if (action === "couple") {
    next.wantsCouple = true;
    next.guests = 2;
  }
  if (action === "business") next.wantsBusiness = true;
  if (action === "cheapest") next.sortBy = "PRICE_ASC";
  if (action === "best") next.sortBy = "RATING_DESC";
  if (action === "value") next.sortBy = "POPULAR";

  return next;
}

export function toSearchParams(query: TstParsedQuery) {
  const params = new URLSearchParams();
  if (query.city) params.set("city", query.city);
  if (query.minPrice != null) params.set("minPrice", String(query.minPrice));
  if (query.maxPrice != null) params.set("maxPrice", String(query.maxPrice));
  if (query.guests != null && query.guests > 0) params.set("guests", String(query.guests));
  if (query.wifi) params.set("wifi", "true");
  if (query.breakfast) params.set("breakfast", "true");
  if (query.parking) params.set("parking", "true");
  if (query.propertyType && query.propertyType !== "ANY") params.set("propertyType", query.propertyType);
  if (query.ratingMin != null) params.set("ratingMin", String(query.ratingMin));
  if (query.sortBy) params.set("sortBy", query.sortBy);
  if (query.checkIn) params.set("checkIn", query.checkIn);
  if (query.checkOut) params.set("checkOut", query.checkOut);
  return params;
}

export function toSearchHref(query: TstParsedQuery) {
  const params = toSearchParams(query);
  const qs = params.toString();
  return qs ? `/search?${qs}` : "/search";
}

function matchesKeywordNeed(hotel: TstHotel, query: TstParsedQuery) {
  const text = hotelText(hotel);
  if (query.wantsQuiet && !hasKeyword(text, QUIET_KEYS)) return false;
  if (query.wantsView && !hasKeyword(text, VIEW_KEYS)) return false;
  if (query.wantsCenter && !hasKeyword(text, CENTER_KEYS)) return false;
  if (query.wantsNature && !hasKeyword(text, NATURE_KEYS)) return false;
  if (query.wantsMountain && !hasKeyword(text, MOUNTAIN_KEYS)) return false;
  if (query.wantsRiver && !hasKeyword(text, RIVER_KEYS)) return false;
  if (query.wantsFamily) {
    const familyAmenity = hotelAmenities(hotel).some((item) => ["family_room", "crib", "extra_bed"].includes(item));
    const guests = query.guests ?? 3;
    if (maxCapacity(hotel) < guests && !familyAmenity && !hasKeyword(text, FAMILY_TEXT_KEYS)) return false;
  }
  return true;
}

function insufficientKind(query: TstParsedQuery): "quiet" | "view" | "center" | "nature" | "mountain" | "river" | null {
  if (query.wantsQuiet) return "quiet";
  if (query.wantsMountain) return "mountain";
  if (query.wantsRiver) return "river";
  if (query.wantsView) return "view";
  if (query.wantsCenter) return "center";
  if (query.wantsNature) return "nature";
  return null;
}

function reasonsFor(hotel: TstHotel, query: TstParsedQuery, minPrice: number): TstReasonKey[] {
  const text = hotelText(hotel);
  const amenities = hotelAmenities(hotel);
  const reasons: TstReasonKey[] = [];
  if (query.city && hotel.city.toLowerCase().includes(query.city.toLowerCase())) reasons.push("city");
  if (query.wifi && amenities.includes("wifi")) reasons.push("wifi");
  if (query.breakfast && (amenities.includes("breakfast") || amenities.includes("breakfast_included"))) reasons.push("breakfast");
  if (query.parking && amenities.includes("parking")) reasons.push("parking");
  if (query.maxPrice != null && minPrice <= query.maxPrice) reasons.push("budget");
  if (query.wantsQuiet && hasKeyword(text, QUIET_KEYS)) reasons.push("quiet");
  if (query.wantsView && hasKeyword(text, VIEW_KEYS)) reasons.push("view");
  if (query.wantsCenter && hasKeyword(text, CENTER_KEYS)) reasons.push("center");
  if (query.wantsNature && hasKeyword(text, NATURE_KEYS)) reasons.push("nature");
  if (query.wantsMountain && hasKeyword(text, MOUNTAIN_KEYS)) reasons.push("mountain");
  if (query.wantsRiver && hasKeyword(text, RIVER_KEYS)) reasons.push("river");
  if (query.wantsFamily && maxCapacity(hotel) >= (query.guests ?? 3)) reasons.push("family");
  if (query.wantsBusiness && (amenities.includes("wifi") || amenities.includes("desk") || hasKeyword(text, CENTER_KEYS))) {
    reasons.push("business");
  }
  if (storedRating(hotel) != null && (query.action === "best" || query.ratingMin != null)) reasons.push("rating");
  if (query.action === "cheapest") reasons.push("price");
  if (availableRooms(hotel).length) reasons.push("available");
  return [...new Set(reasons)];
}

function countCriteria(query: TstParsedQuery) {
  let n = 0;
  if (query.city) n += 1;
  if (query.maxPrice != null || query.minPrice != null) n += 1;
  if (query.wifi) n += 1;
  if (query.breakfast) n += 1;
  if (query.parking) n += 1;
  if (query.wantsQuiet || query.wantsView || query.wantsCenter || query.wantsNature) n += 1;
  if (query.wantsFamily || query.wantsBusiness) n += 1;
  if (query.action === "best" || query.ratingMin != null) n += 1;
  return Math.max(n, 1);
}

export function computeMatchScore(hotel: TstHotel, query: TstParsedQuery, reasons: TstReasonKey[], valueNorm: number) {
  const criteria = countCriteria(query);
  const factual = reasons.filter((r) => r !== "available" && r !== "price").length;
  const factualRatio = Math.min(1, factual / criteria);
  const rating = storedRating(hotel);
  const ratingPart = rating != null ? rating / 5 : 0.35;
  const budgetPart =
    query.maxPrice != null && hotelMinPrice(hotel) <= query.maxPrice
      ? 1
      : query.maxPrice != null
        ? Math.max(0, 1 - (hotelMinPrice(hotel) - query.maxPrice) / Math.max(query.maxPrice, 1))
        : 0.5;

  let score =
    factualRatio * 0.45 +
    (1 - valueNorm) * 0.2 +
    ratingPart * 0.15 +
    budgetPart * (query.maxPrice != null || query.action === "budget" ? 0.2 : 0.08);

  if (query.wantsCheaper || query.action === "cheapest") score = budgetPart * 0.55 + (1 - valueNorm) * 0.25 + factualRatio * 0.2;
  if (query.wantsCenter || query.wantsQuiet || query.wantsView) score = factualRatio * 0.55 + ratingPart * 0.2 + budgetPart * 0.25;
  if (query.action === "best" || query.wantsBetter) score = ratingPart * 0.45 + factualRatio * 0.3 + budgetPart * 0.25;

  return Math.round(Math.min(99, Math.max(62, score * 100)));
}

function similarityToReference(hotel: TstHotel, reference: TstHotel) {
  const refAmenities = new Set(hotelAmenities(reference));
  const hotelAm = hotelAmenities(hotel);
  const overlap = hotelAm.filter((item) => refAmenities.has(item)).length;
  const amenityScore = refAmenities.size ? overlap / refAmenities.size : 0.5;
  const cityScore = hotel.city.toLowerCase() === reference.city.toLowerCase() ? 1 : 0;
  const typeScore = hotel.propertyType && reference.propertyType && hotel.propertyType === reference.propertyType ? 1 : 0.3;
  return amenityScore * 0.5 + cityScore * 0.35 + typeScore * 0.15;
}

function valueScore(hotel: TstHotel, minPrice: number, priceMin: number, priceMax: number) {
  const priceNorm = priceMax === priceMin ? 0.5 : (minPrice - priceMin) / (priceMax - priceMin);
  const amenityScore = Math.min(hotelAmenities(hotel).length, 6) / 6;
  const rating = storedRating(hotel);
  const ratingScore = rating != null ? rating / 5 : 0.35;
  const availScore = availableRooms(hotel).length ? 1 : 0;
  return (1 - priceNorm) * 0.35 + amenityScore * 0.25 + ratingScore * 0.25 + availScore * 0.15;
}

function toMatch(hotel: TstHotel, query: TstParsedQuery, valueNorm = 0.5): TstMatch | null {
  const minPrice = hotelMinPrice(hotel);
  if (!Number.isFinite(minPrice)) return null;
  const reasons = reasonsFor(hotel, query, minPrice);
  return {
    hotel,
    minPrice,
    maxCapacity: maxCapacity(hotel),
    amenities: hotelAmenities(hotel),
    reasons,
    availableCount: availableRooms(hotel).length,
    rating: storedRating(hotel),
    matchScore: computeMatchScore(hotel, query, reasons, valueNorm)
  };
}

export function rankTstHotels(hotels: TstHotel[], query: TstParsedQuery, reference?: TstHotel | null): TstOutcome {
  let pool = hotels.filter((hotel) => Number.isFinite(hotelMinPrice(hotel)) && availableRooms(hotel).length > 0);
  if (query.excludeHotelId) pool = pool.filter((hotel) => hotel.id !== query.excludeHotelId);

  if (reference) {
    if (!query.city) query = { ...query, city: reference.city };
    if (query.wantsCheaper) {
      const refPrice = hotelMinPrice(reference);
      pool = pool.filter((hotel) => hotelMinPrice(hotel) < refPrice);
    }
  }

  if (!pool.length) return { status: "empty", query };

  const matched = pool.filter((hotel) => matchesKeywordNeed(hotel, query));
  const working = matched.length ? matched : pool;
  if (!matched.length && insufficientKind(query)) {
    return { status: "insufficient", query, kind: insufficientKind(query)! };
  }

  const prices = working.map(hotelMinPrice);
  const priceMin = Math.min(...prices);
  const priceMax = Math.max(...prices);

  const sorted = [...working].sort((a, b) => {
    const aPrice = hotelMinPrice(a);
    const bPrice = hotelMinPrice(b);
    const aRating = storedRating(a) ?? -1;
    const bRating = storedRating(b) ?? -1;
    const aNorm = priceMax === priceMin ? 0.5 : (aPrice - priceMin) / (priceMax - priceMin);
    const bNorm = priceMax === priceMin ? 0.5 : (bPrice - priceMin) / (priceMax - priceMin);

    if (reference && (query.wantsSimilar || query.wantsBetter)) {
      const simDiff = similarityToReference(b, reference) - similarityToReference(a, reference);
      if (simDiff !== 0) return simDiff;
    }
    if (query.wantsCheaper || query.action === "cheapest") return aPrice - bPrice;
    if (query.action === "best" || query.wantsBetter) {
      if (bRating !== aRating) return bRating - aRating;
      return aPrice - bPrice;
    }
    const aVal = valueScore(a, aPrice, priceMin, priceMax);
    const bVal = valueScore(b, bPrice, priceMin, priceMax);
    if (bVal !== aVal) return bVal - aVal;
    return aPrice - bPrice;
  });

  const matches = sorted
    .map((hotel) => {
      const price = hotelMinPrice(hotel);
      const norm = priceMax === priceMin ? 0.5 : (price - priceMin) / (priceMax - priceMin);
      return toMatch(hotel, query, norm);
    })
    .filter((item): item is TstMatch => item != null)
    .slice(0, 3);

  if (!matches.length) return { status: "empty", query };
  return { status: "ok", query, matches };
}

export function rankWithContext(hotels: TstHotel[], query: TstParsedQuery, reference?: TstHotel | null) {
  return rankTstHotels(hotels, query, reference);
}

export function nearestMinPrice(hotels: TstHotel[]) {
  const prices = hotels.map(hotelMinPrice).filter((price) => Number.isFinite(price));
  return prices.length ? Math.min(...prices) : null;
}

export function summarizeRooms(hotel: TstHotel): TstRoomGroup[] {
  const groups = new Map<string, TstRoomGroup & { fingerprints: Set<string> }>();
  for (const room of availableRooms(hotel)) {
    const title = (room.title ?? "Номер").trim() || "Номер";
    const price = Number(room.price);
    if (!Number.isFinite(price) || price <= 0) continue;
    const amenities = parseAmenitiesJson(room.amenities).map((item) => item.toLowerCase()).sort();
    const capacity = Number(room.capacity) || 0;
    const fingerprint = `${title.toLowerCase()}|${price}|${capacity}|${amenities.join(",")}`;
    const existing = groups.get(title.toLowerCase());
    if (!existing) {
      groups.set(title.toLowerCase(), {
        title,
        count: 1,
        minPrice: price,
        capacity,
        amenities,
        identical: true,
        fingerprints: new Set([fingerprint])
      });
      continue;
    }
    existing.count += 1;
    existing.minPrice = Math.min(existing.minPrice, price);
    existing.fingerprints.add(fingerprint);
    existing.identical = existing.fingerprints.size === 1;
    if (capacity > existing.capacity) existing.capacity = capacity;
  }
  return [...groups.values()].map(({ fingerprints: _fp, ...group }) => group);
}

export function compareHotels(matches: TstMatch[]): TstCompareRow[] {
  return matches.slice(0, 3).map((item) => ({
    hotelId: item.hotel.id,
    name: item.hotel.name,
    city: item.hotel.city,
    address: item.hotel.address?.trim() || item.hotel.city,
    minPrice: item.minPrice,
    rating: item.rating,
    amenities: item.amenities,
    availableCount: item.availableCount,
    roomsLabel: `${item.availableCount}`
  }));
}

export function hotelHref(hotelId: number, query?: TstParsedQuery) {
  const params = new URLSearchParams();
  if (query?.checkIn) params.set("checkIn", query.checkIn);
  if (query?.checkOut) params.set("checkOut", query.checkOut);
  const qs = params.toString();
  return qs ? `/hotel/${hotelId}?${qs}` : `/hotel/${hotelId}`;
}

export function dropSoftFilters(query: TstParsedQuery): TstParsedQuery {
  return {
    city: query.city,
    guests: query.guests,
    propertyType: query.propertyType,
    checkIn: query.checkIn,
    checkOut: query.checkOut,
    action: query.action
  };
}
