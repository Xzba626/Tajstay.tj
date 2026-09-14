import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOwnerUser } from "@/lib/auth/requireOwner";
import { forbiddenJson } from "@/lib/auth/apiResponses";

/**
 * Owner-only toggle for BLOCK 5.4B's `Hotel.acceptsPayAtCheckIn` policy. Deliberately a tiny,
 * single-purpose route (mirrors the payment-methods PATCH pattern) rather than folded into the
 * big multipart hotel-edit POST route - this is a security-relevant boolean, not cosmetic profile
 * data, and its own authorization check must be trivial to audit in isolation.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const owner = await getOwnerUser();
  if (!owner) return forbiddenJson();

  const hotelId = Number(params.id);
  if (!hotelId) return NextResponse.json({ error: "invalid_id" }, { status: 400 });

  // Cross-hotel owner denied: findFirst scoped to (id, ownerId) together, never a bare findUnique
  // on id followed by a separate ownership check - the same pattern proven in BLOCK 5.2/5.3.
  const hotel = await prisma.hotel.findFirst({ where: { id: hotelId, ownerId: owner.id } });
  if (!hotel) return forbiddenJson();

  const body = await req.json().catch(() => null);
  if (!body || typeof body.acceptsPayAtCheckIn !== "boolean") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const updated = await prisma.hotel.update({
    where: { id: hotelId },
    data: { acceptsPayAtCheckIn: body.acceptsPayAtCheckIn },
    select: { id: true, acceptsPayAtCheckIn: true }
  });

  return NextResponse.json({ ok: true, hotel: updated });
}
