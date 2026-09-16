import { NextRequest, NextResponse } from "next/server";
import { getOwnerUser } from "@/lib/auth/requireOwner";
import { forbiddenJson } from "@/lib/auth/apiResponses";
import {
  createHotelManager,
  listHotelStaff,
  reactivateHotelStaff,
  removeHotelStaffAccess,
  resetHotelStaffAccess,
  suspendHotelStaff
} from "@/lib/staff/staffService";
import { STAFF_STATUS } from "@/lib/staff/types";

export async function GET(req: NextRequest) {
  const owner = await getOwnerUser();
  if (!owner) return forbiddenJson();
  const hotelId = Number(req.nextUrl.searchParams.get("hotelId") || "");
  if (!hotelId) return NextResponse.json({ error: "hotel_required" }, { status: 400 });

  try {
    const rows = await listHotelStaff(owner.id, hotelId);
    return NextResponse.json({
      ok: true,
      items: rows.map((s) => ({
        id: s.id,
        userId: s.userId,
        name: s.user.name,
        phone: s.user.phone,
        staffRole: s.staffRole,
        status: s.status,
        mustChangePassword: s.mustChangePassword,
        lastActiveAt: s.lastActiveAt?.toISOString() ?? null,
        createdAt: s.createdAt.toISOString()
      }))
    });
  } catch (e) {
    const code = e instanceof Error ? e.message : "failed";
    if (code === "FORBIDDEN") return forbiddenJson();
    return NextResponse.json({ error: code }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  const owner = await getOwnerUser();
  if (!owner) return forbiddenJson();

  const body = await req.json().catch(() => ({}));
  const hotelId = Number(body.hotelId || "");
  const firstName = String(body.firstName ?? "").trim();
  const lastName = String(body.lastName ?? "").trim();
  const phone = String(body.phone ?? "").trim();

  if (!hotelId || !firstName || !lastName || !phone) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  try {
    const created = await createHotelManager({
      ownerId: owner.id,
      hotelId,
      firstName,
      lastName,
      phone
    });
    // tempPassword + inviteToken returned ONCE — never persisted as plaintext.
    return NextResponse.json({ ok: true, ...created });
  } catch (e) {
    const code = e instanceof Error ? e.message : "failed";
    if (code === "FORBIDDEN") return forbiddenJson();
    const status = code === "ALREADY_STAFF" || code === "PHONE_HAS_PRIVILEGED_ROLE" ? 409 : 400;
    return NextResponse.json({ error: code }, { status });
  }
}

export async function PATCH(req: NextRequest) {
  const owner = await getOwnerUser();
  if (!owner) return forbiddenJson();

  const body = await req.json().catch(() => ({}));
  const hotelId = Number(body.hotelId || "");
  const staffId = Number(body.staffId || "");
  const action = String(body.action || "");

  if (!hotelId || !staffId || !action) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  try {
    if (action === "suspend") {
      await suspendHotelStaff({ ownerId: owner.id, hotelId, staffId });
      return NextResponse.json({ ok: true, status: STAFF_STATUS.SUSPENDED });
    }
    if (action === "reactivate") {
      await reactivateHotelStaff({ ownerId: owner.id, hotelId, staffId });
      return NextResponse.json({ ok: true, status: STAFF_STATUS.ACTIVE });
    }
    if (action === "remove") {
      await removeHotelStaffAccess({ ownerId: owner.id, hotelId, staffId });
      return NextResponse.json({ ok: true, status: STAFF_STATUS.REMOVED });
    }
    if (action === "reset") {
      const reset = await resetHotelStaffAccess({ ownerId: owner.id, hotelId, staffId });
      return NextResponse.json({ ok: true, ...reset });
    }
    return NextResponse.json({ error: "unknown_action" }, { status: 400 });
  } catch (e) {
    const code = e instanceof Error ? e.message : "failed";
    if (code === "FORBIDDEN") return forbiddenJson();
    if (code === "NOT_FOUND") return NextResponse.json({ error: code }, { status: 404 });
    return NextResponse.json({ error: code }, { status: 400 });
  }
}
