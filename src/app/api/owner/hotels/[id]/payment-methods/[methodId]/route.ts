import { NextRequest, NextResponse } from "next/server";
import { getOwnerUser } from "@/lib/auth/requireOwner";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import { deleteHotelPaymentMethod, updateHotelPaymentMethod } from "@/lib/hotels/paymentMethods";

function parseIds(params: { id: string; methodId: string }) {
  const hotelId = Number(params.id);
  const methodId = Number(params.methodId);
  if (!Number.isFinite(hotelId) || hotelId < 1 || !Number.isFinite(methodId) || methodId < 1) {
    return null;
  }
  return { hotelId, methodId };
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string; methodId: string } }) {
  const owner = await getOwnerUser();
  if (!owner) return forbiddenJson();

  const ids = parseIds(params);
  if (!ids) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json().catch(() => ({}));

  try {
    const method = await updateHotelPaymentMethod(ids.hotelId, ids.methodId, owner.id, {
      type: body?.type !== undefined ? String(body.type) : undefined,
      displayLabel: body?.displayLabel !== undefined ? String(body.displayLabel) : undefined,
      recipientName: body?.recipientName !== undefined ? String(body.recipientName) : undefined,
      paymentIdentifier: body?.paymentIdentifier !== undefined ? String(body.paymentIdentifier) : undefined,
      instructions: body?.instructions !== undefined ? String(body.instructions) : undefined,
      isActive: body?.isActive !== undefined ? Boolean(body.isActive) : undefined,
      sortOrder: body?.sortOrder !== undefined ? Number(body.sortOrder) : undefined
    });
    return NextResponse.json({ method });
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    if (code === "FORBIDDEN") return forbiddenJson();
    if (code === "NOT_FOUND") return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (code === "INVALID_TYPE" || code === "INVALID_INPUT") {
      return NextResponse.json({ error: "Invalid payment method data" }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; methodId: string } }) {
  const owner = await getOwnerUser();
  if (!owner) return forbiddenJson();

  const ids = parseIds(params);
  if (!ids) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  try {
    await deleteHotelPaymentMethod(ids.hotelId, ids.methodId, owner.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    if (code === "FORBIDDEN") return forbiddenJson();
    if (code === "NOT_FOUND") return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
