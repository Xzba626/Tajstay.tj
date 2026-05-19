import { NextRequest, NextResponse } from "next/server";
import { saveUploadFile } from "@/lib/uploads/saveUpload";
import { ImageUploadError } from "@/lib/uploads/imageUploadError";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/requireAuth";
import { BOOKING_STATUS } from "@/lib/domain/booking";
import { publicUrl } from "@/lib/http/publicOrigin";
import { clientIp, rateLimit } from "@/lib/security/rateLimit";
import { isSafePublicHttpsUrl } from "@/lib/security/safeUrl";

const MAX_FILE_BYTES = 4 * 1024 * 1024; // 4MB

function isSafeProofUrl(raw: string): boolean {
  const s = raw.trim();
  if (!s) return false;
  if (s.startsWith("/") && !s.startsWith("//")) return true;
  try {
    return isSafePublicHttpsUrl(s);
  } catch {
    return false;
  }
}

async function saveProofFile(file: File): Promise<string | null> {
  try {
    return await saveUploadFile(file, "payment-proofs", MAX_FILE_BYTES);
  } catch (err) {
    if (err instanceof ImageUploadError) return null;
    throw err;
  }
}

export async function POST(req: NextRequest) {
  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = clientIp(req);
  const ipRl = rateLimit(`post:payment-proof:ip:${ip}`, 15, 60_000);
  if (!ipRl.ok) {
    const res = NextResponse.json({ error: "Too many attempts. Try later." }, { status: 429 });
    if (ipRl.retryAfterSec) res.headers.set("Retry-After", String(ipRl.retryAfterSec));
    return res;
  }
  const userRl = rateLimit(`post:payment-proof:user:${user.id}`, 10, 10 * 60_000);
  if (!userRl.ok) {
    const res = NextResponse.json({ error: "Too many attempts. Try later." }, { status: 429 });
    if (userRl.retryAfterSec) res.headers.set("Retry-After", String(userRl.retryAfterSec));
    return res;
  }

  const form = await req.formData();
  const code = String(form.get("code") ?? "").trim();
  const proofUrlInput = String(form.get("proofUrl") ?? "").trim();
  const proofFile = form.get("proofFile");

  let proofUrl = "";
  if (proofUrlInput && isSafeProofUrl(proofUrlInput)) proofUrl = proofUrlInput;
  if (!proofUrl && proofFile instanceof File) {
    const uploaded = await saveProofFile(proofFile);
    if (uploaded) proofUrl = uploaded;
  }

  if (!code || !proofUrl) {
    return NextResponse.redirect(publicUrl(req, `/payment/${encodeURIComponent(code || "")}`));
  }

  const booking = await prisma.booking.findUnique({
    where: { publicCode: code },
    include: { room: { include: { hotel: true } } }
  });
  if (!booking || booking.userId !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const payWindowExpired =
    !booking.paymentTimerPaused &&
    booking.expiresAt &&
    booking.expiresAt.getTime() < Date.now();
  if (payWindowExpired) {
    await prisma.booking.update({ where: { id: booking.id }, data: { status: BOOKING_STATUS.EXPIRED } }).catch(() => undefined);
    return NextResponse.redirect(publicUrl(req, `/payment/${encodeURIComponent(code)}`));
  }

  const transitioned = await prisma.booking.updateMany({
    where: {
      id: booking.id,
      userId: user.id,
      publicCode: code,
      status: { in: [BOOKING_STATUS.WAITING_PAYMENT, BOOKING_STATUS.WAIT_PROOF] }
    },
    data: {
      status: BOOKING_STATUS.ON_REVIEW,
      paymentProofUrl: proofUrl,
      proofSubmittedAt: new Date(),
      proofReviewDeadlineAt: new Date(Date.now() + 5 * 60 * 1000),
      paymentTimerPaused: true,
      expiresAt: null
    }
  });

  if (transitioned.count > 0) {
    await prisma.notification.create({
      data: {
        userId: booking.room.hotel.ownerId,
        bookingId: booking.id,
        type: "PAYMENT_PROOF_SUBMITTED",
        isRead: false
      }
    });
  }

  return NextResponse.redirect(publicUrl(req, `/payment/${encodeURIComponent(code)}`));
}
