import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireAuth";
import { prisma } from "@/lib/prisma";
import { sameOriginRedirectUrl } from "@/lib/http/safeRedirect";
import { clientIp, rateLimit } from "@/lib/security/rateLimit";

export async function POST(req: Request) {
  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = clientIp(req);
  const rl = rateLimit(`post:fav-toggle:ip:${ip}`, 60, 60_000);
  if (!rl.ok) {
    const res = NextResponse.json({ error: "Too many attempts. Try later." }, { status: 429 });
    if (rl.retryAfterSec) res.headers.set("Retry-After", String(rl.retryAfterSec));
    return res;
  }

  const form = await req.formData();
  const hotelId = Number(form.get("hotelId"));
  if (!hotelId) return NextResponse.json({ error: "Invalid hotelId" }, { status: 400 });

  const existing = await prisma.favorite.findFirst({
    where: { userId: user.id, hotelId }
  });

  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
  } else {
    await prisma.favorite.create({ data: { userId: user.id, hotelId } });
  }

  return NextResponse.redirect(sameOriginRedirectUrl(req, req.headers.get("referer"), "/favorites"));
}

