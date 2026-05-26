import { NextRequest, NextResponse } from "next/server";
import { saveUploadFile } from "@/lib/uploads/saveUpload";
import { ImageUploadError } from "@/lib/uploads/imageUploadError";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/requireAuth";
import { publicUrl } from "@/lib/http/publicOrigin";
import { clientIp, rateLimit } from "@/lib/security/rateLimit";
import { bookingHotel } from "@/lib/pms/bookingContext";

const MAX_FILE_BYTES = 6 * 1024 * 1024; // 6MB

async function saveGuestDocFile(file: File): Promise<string | null> {
  try {
    return await saveUploadFile(file, "guest-docs", MAX_FILE_BYTES);
  } catch (err) {
    if (err instanceof ImageUploadError) return null;
    throw err;
  }
}

export async function POST(req: NextRequest) {
  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = clientIp(req);
  const ipRl = rateLimit(`post:guest-doc:ip:${ip}`, 20, 60_000);
  if (!ipRl.ok) {
    const res = NextResponse.json({ error: "Too many attempts. Try later." }, { status: 429 });
    if (ipRl.retryAfterSec) res.headers.set("Retry-After", String(ipRl.retryAfterSec));
    return res;
  }
  const userRl = rateLimit(`post:guest-doc:user:${user.id}`, 10, 10 * 60_000);
  if (!userRl.ok) {
    const res = NextResponse.json({ error: "Too many attempts. Try later." }, { status: 429 });
    if (userRl.retryAfterSec) res.headers.set("Retry-After", String(userRl.retryAfterSec));
    return res;
  }

  const form = await req.formData();
  const bookingId = Number(form.get("bookingId"));
  const docFile = form.get("docFile");
  if (!bookingId || !(docFile instanceof File)) {
    return NextResponse.redirect(publicUrl(req, "/dashboard/guest?error=document"));
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      room: { include: { hotel: true } },
      roomType: { include: { hotel: true } },
      assignedRoom: { include: { hotel: true } }
    }
  });
  if (!booking || booking.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const saved = await saveGuestDocFile(docFile);
  if (!saved) {
    return NextResponse.redirect(publicUrl(req, "/dashboard/guest?error=document"));
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      guestDocumentUrl: saved,
      guestDocumentSubmittedAt: new Date()
    }
  });

  await prisma.notification.create({
    data: {
      userId: bookingHotel(booking).ownerId,
      bookingId: booking.id,
      type: "GUEST_DOCUMENT_SUBMITTED",
      isRead: false
    }
  });

  return NextResponse.redirect(publicUrl(req, "/dashboard/guest"));
}

