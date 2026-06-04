export type ReviewCriteriaScores = {
  cleanliness: number;
  staff: number;
  location: number;
  value: number;
  overall: number;
};

const MARKER = "\n<!--tajstay-criteria:";

export function encodeCriteriaInComment(comment: string, scores: ReviewCriteriaScores): string {
  const payload = JSON.stringify(scores);
  const base = comment.trim();
  return base ? `${base}${MARKER}${payload}-->` : `${MARKER}${payload}-->`;
}

export function averageCriteriaRating(scores: ReviewCriteriaScores): number {
  const vals = [scores.cleanliness, scores.staff, scores.location, scores.value, scores.overall];
  const sum = vals.reduce((a, b) => a + b, 0);
  return Math.round(sum / vals.length);
}

export function parseCriteriaFromComment(comment: string): ReviewCriteriaScores | null {
  const idx = comment.indexOf(MARKER);
  if (idx < 0) return null;
  const end = comment.indexOf("-->", idx);
  if (end < 0) return null;
  try {
    const raw = comment.slice(idx + MARKER.length, end);
    const data = JSON.parse(raw) as Partial<ReviewCriteriaScores>;
    if (
      typeof data.cleanliness === "number" &&
      typeof data.staff === "number" &&
      typeof data.location === "number" &&
      typeof data.value === "number" &&
      typeof data.overall === "number"
    ) {
      return data as ReviewCriteriaScores;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function stripCriteriaMarker(comment: string): string {
  const idx = comment.indexOf(MARKER);
  if (idx < 0) return comment.trim();
  return comment.slice(0, idx).trim();
}
