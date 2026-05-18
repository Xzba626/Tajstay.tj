import { prisma } from "@/lib/prisma";

function randInt(min: number, max: number) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

/** Generate short human code like TJ-7704 (unique). */
export async function generateBookingCode(prefix = "TJ"): Promise<string> {
  for (let i = 0; i < 12; i++) {
    const code = `${prefix}-${randInt(1000, 9999)}`;
    const exists = await prisma.booking.findUnique({ where: { publicCode: code } });
    if (!exists) return code;
  }
  // Fallback: include time slice
  const code = `${prefix}-${Date.now().toString().slice(-6)}`;
  return code;
}

