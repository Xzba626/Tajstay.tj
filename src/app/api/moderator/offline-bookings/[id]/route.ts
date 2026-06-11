import { NextRequest, NextResponse } from "next/server";
import { isGuardResponse, requireBookingApiPermission, PERMISSION } from "@/lib/auth/apiGuard";
import { updateModeratorOfflineBooking } from "@/lib/moderator/offlineBooking";
import { OFFLINE_STATUS } from "@/lib/domain/booking";
import { publicUrl } from "@/lib/http/publicOrigin";

function parseDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
}

async function handleOfflineBookingUpdate(req: NextRequest, params: { id: string }) {
  const bookingId = Number(params.id);
  if (!bookingId) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const user = await requireBookingApiPermission(bookingId, PERMISSION.OFFLINE_BOOKING);
  if (isGuardResponse(user)) return user;

  const wantsJson =
    (req.headers.get("accept") ?? "").toLowerCase().includes("application/json") ||
    req.nextUrl.searchParams.get("json") === "1";

  let body: Record<string, unknown> = {};
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  } else {
    const form = await req.formData();
    for (const [k, v] of form.entries()) body[k] = typeof v === "string" ? v : String(v);
  }

  const checkInRaw = body.checkIn != null ? String(body.checkIn) : "";
  const checkOutRaw = body.checkOut != null ? String(body.checkOut) : "";
  const checkIn = checkInRaw ? parseDateOnly(checkInRaw) : undefined;
  const checkOut = checkOutRaw ? parseDateOnly(checkOutRaw) : undefined;

  try {
    await updateModeratorOfflineBooking(user.id, {
      bookingId,
      offlineStatus: body.offlineStatus
        ? (String(body.offlineStatus).toUpperCase() as (typeof OFFLINE_STATUS)[keyof typeof OFFLINE_STATUS])
        : undefined,
      totalPrice: body.totalPrice != null ? Number(body.totalPrice) : undefined,
      prepayment: body.prepayment !== undefined ? (body.prepayment === "" ? null : Number(body.prepayment)) : undefined,
      offlinePaymentType: body.offlinePaymentType != null ? String(body.offlinePaymentType) : undefined,
      offlineNote: body.offlineNote != null ? String(body.offlineNote) : undefined,
      checkIn: checkIn ?? undefined,
      checkOut: checkOut ?? undefined
    });

    if (wantsJson) return NextResponse.json({ ok: true });

    const u = publicUrl(req, "/dashboard/moderator");
    u.searchParams.set("section", "offline-bookings");
    u.searchParams.set("updated", "1");
    return NextResponse.redirect(u);
  } catch (e) {
    const code = e instanceof Error ? e.message : "failed";
    if (wantsJson) return NextResponse.json({ error: code }, { status: 400 });
    const u = publicUrl(req, "/dashboard/moderator");
    u.searchParams.set("section", "offline-bookings");
    u.searchParams.set("error", code === "dates_unavailable" ? "dates" : "failed");
    return NextResponse.redirect(u);
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return handleOfflineBookingUpdate(req, params);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return handleOfflineBookingUpdate(req, params);
}
