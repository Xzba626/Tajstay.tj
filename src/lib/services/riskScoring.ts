export type HotelRiskInput = {
  status: string;
  rating: number;
  coverImageUrl?: string | null;
  ownerVerified?: boolean;
  createdAt: Date;
};

export function scoreHotelRisk(input: HotelRiskInput) {
  let score = 0;
  const reasons: string[] = [];

  if (input.status !== "APPROVED") {
    score += 20;
    reasons.push("needs moderation");
  }
  if (input.rating < 3.5) {
    score += 18;
    reasons.push("low rating");
  }
  if (!input.coverImageUrl) {
    score += 12;
    reasons.push("missing cover image");
  }
  if (!input.ownerVerified) {
    score += 25;
    reasons.push("owner not verified");
  }
  if (Date.now() - input.createdAt.getTime() < 3 * 24 * 60 * 60 * 1000) {
    score += 10;
    reasons.push("new listing");
  }

  const level = score >= 50 ? "HIGH" : score >= 25 ? "MEDIUM" : "LOW";
  return { score, level, reasons };
}
