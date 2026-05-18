import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireAuth";
import { prisma } from "@/lib/prisma";
import { sameOriginRedirectUrl } from "@/lib/http/safeRedirect";
import { clientIp, rateLimit } from "@/lib/security/rateLimit";

export async function POST(req: Request) {
  const user = await requireUser(["GUEST"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = clientIp(req);
  const rl = rateLimit(`post:complaint:ip:${ip}`, 10, 60_000);
  if (!rl.ok) {
    const res = NextResponse.json({ error: "Too many attempts. Try later." }, { status: 429 });
    if (rl.retryAfterSec) res.headers.set("Retry-After", String(rl.retryAfterSec));
    return res;
  }

  const form = await req.formData();
  const bookingId = Number(form.get("bookingId"));
  const message = String(form.get("message") ?? "").trim();

  if (!bookingId || !message) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.userId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.complaint.create({
    data: {
      userId: user.id,
      bookingId,
      message,
      status: "PENDING"
    }
  });

  return NextResponse.redirect(sameOriginRedirectUrl(req, req.headers.get("referer"), "/dashboard/guest"));
}

