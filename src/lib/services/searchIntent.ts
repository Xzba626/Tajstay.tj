type IntentSignals = {
  family: boolean;
  scenic: boolean;
  budget: boolean;
  comfort: boolean;
};

const SEMANTIC_SYNONYMS: Record<string, string[]> = {
  family: ["family", "семья", "дети", "child", "kids", "семейный"],
  view: ["view", "вид", "горы", "mountain", "панорама"],
  budget: ["cheap", "budget", "дешево", "недорого", "эконом"],
  comfort: ["comfort", "cozy", "уют", "тихо", "спокойно", "luxury"],
  center: ["center", "центр", "downtown", "рядом"]
};

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function semanticVector(text: string) {
  const tokens = tokenize(text);
  const vector: Record<string, number> = {};
  for (const [bucket, words] of Object.entries(SEMANTIC_SYNONYMS)) {
    vector[bucket] = words.reduce((acc, w) => acc + (tokens.includes(w) ? 1 : 0), 0);
  }
  return vector;
}

function cosine(a: Record<string, number>, b: Record<string, number>) {
  const keys = Object.keys(SEMANTIC_SYNONYMS);
  let dot = 0;
  let aNorm = 0;
  let bNorm = 0;
  for (const key of keys) {
    const av = a[key] ?? 0;
    const bv = b[key] ?? 0;
    dot += av * bv;
    aNorm += av * av;
    bNorm += bv * bv;
  }
  if (aNorm === 0 || bNorm === 0) return 0;
  return dot / (Math.sqrt(aNorm) * Math.sqrt(bNorm));
}

function parseSignals(query: string): IntentSignals {
  const q = query.toLowerCase();
  return {
    family: /(семь|дет|family)/.test(q),
    scenic: /(вид|горы|природ|mountain|view)/.test(q),
    budget: /(деш|бюджет|недорог|cheap|budget)/.test(q),
    comfort: /(уют|комфорт|тихо|cozy|quiet|comfort)/.test(q)
  };
}

export function scoreHotelByIntent(input: {
  query?: string;
  hotelName: string;
  city: string;
  rating: number;
  minPrice: number;
  rooms: Array<{ capacity: number; amenities: string }>;
}): number {
  const query = (input.query ?? "").trim();
  if (!query) return 0;

  const signals = parseSignals(query);
  const queryVec = semanticVector(query);
  const hotelVec = semanticVector(`${input.hotelName} ${input.city}`);
  let score = 0;

  const textBlob = `${input.hotelName} ${input.city}`.toLowerCase();
  if (textBlob.includes(query.toLowerCase())) score += 12;

  if (signals.family) {
    const hasFamilyRoom = input.rooms.some((room) => room.capacity >= 3);
    if (hasFamilyRoom) score += 8;
  }
  if (signals.scenic) {
    // No geo-view metadata yet; use rating as confidence proxy.
    if (input.rating >= 4.3) score += 5;
  }
  if (signals.budget && input.minPrice > 0 && input.minPrice <= 220) score += 8;
  if (signals.comfort && input.rating >= 4.5) score += 7;
  score += Math.round(cosine(queryVec, hotelVec) * 14);

  return score;
}
