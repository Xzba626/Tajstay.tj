import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOwnerUser } from "@/lib/auth/requireOwner";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { createHotelPaymentMethod, getOwnerHotelPaymentMethods } from "@/lib/hotels/paymentMethods";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const owner = await getOwnerUser();
  if (!owner) return forbiddenJson();

  const hotelId = Number(params.id);
  if (!Number.isFinite(hotelId) || hotelId < 1) {
    return NextResponse.json({ error: "Invalid hotel id" }, { status: 400 });
  }

  try {
    const methods = await getOwnerHotelPaymentMethods(hotelId, owner.id);
    // BLOCK 5.4B: the owner payment-methods panel also surfaces/toggles the pay-at-check-in
    // policy for the same hotel, so return it alongside rather than adding a second round-trip.
    const hotel = await prisma.hotel.findFirst({
      where: { id: hotelId, ownerId: owner.id },
      select: { acceptsPayAtCheckIn: true }
    });
    return NextResponse.json({ methods, acceptsPayAtCheckIn: hotel?.acceptsPayAtCheckIn ?? false });
  } catch (e) {
    if (e instanceof Error && e.message === "FORBIDDEN") return forbiddenJson();
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const owner = await getOwnerUser();
  if (!owner) return forbiddenJson();

  const hotelId = Number(params.id);
  if (!Number.isFinite(hotelId) || hotelId < 1) {
    return NextResponse.json({ error: "Invalid hotel id" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));

  try {
    const method = await createHotelPaymentMethod(hotelId, owner.id, {
      type: String(body?.type ?? ""),
      displayLabel: String(body?.displayLabel ?? ""),
      recipientName: String(body?.recipientName ?? ""),
      paymentIdentifier: String(body?.paymentIdentifier ?? ""),
      instructions: body?.instructions != null ? String(body.instructions) : null,
      isActive: body?.isActive !== undefined ? Boolean(body.isActive) : undefined,
      sortOrder: body?.sortOrder !== undefined ? Number(body.sortOrder) : undefined
    });
    return NextResponse.json({ method }, { status: 201 });
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    if (code === "FORBIDDEN") return forbiddenJson();
    if (code === "INVALID_TYPE" || code === "INVALID_INPUT") {
      return NextResponse.json({ error: "Invalid payment method data" }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
