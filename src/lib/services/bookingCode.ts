import { prisma } from "@/lib/prisma";

import crypto from "node:crypto";

/** Generate short human code like TS-7K4M92 (unique, indexed). Collision → retry. */
export async function generateBookingCode(prefix = "TS"): Promise<string> {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let i = 0; i < 16; i++) {
    const bytes = crypto.randomBytes(6);
    let body = "";
    for (let j = 0; j < 6; j++) body += alphabet[bytes[j]! % alphabet.length];
    const code = `${prefix}-${body}`;
    const exists = await prisma.booking.findUnique({ where: { publicCode: code }, select: { id: true } });
    if (!exists) return code;
  }
  // Extremely unlikely fallback — still unique via time slice + random
  const fallback = `${prefix}-${Date.now().toString(36).toUpperCase().slice(-6)}${crypto.randomBytes(1).toString("hex").toUpperCase()}`;
  return fallback.slice(0, 12);
}
