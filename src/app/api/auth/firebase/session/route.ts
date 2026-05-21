import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { z } from "zod";
import { createSessionCookie } from "@/lib/auth/session";
import { loginUserFromFirebasePhone, verifyFirebaseIdToken } from "@/lib/auth/firebasePhone";
import { isFirebasePhoneAuthConfigured } from "@/lib/firebase/config";
import { clientIp, rateLimit } from "@/lib/security/rateLimit";
import { logAuthEvent } from "@/lib/auth/auditLog";
import { notifyAuthLogin } from "@/lib/auth/authNotifications";

const schema = z.object({
  idToken: z.string().min(20)
});

/** POST /api/auth/firebase/session — вход по Firebase Phone Auth (только существующий аккаунт). */
export async function POST(req: Request) {
  if (!isFirebasePhoneAuthConfigured()) {
    return NextResponse.json({ error: "Firebase phone auth is not configured" }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const ip = clientIp(req);
  const ipRl = rateLimit(`post:firebase-session:ip:${ip}`, 30, 60_000);
  if (!ipRl.ok) {
    const res = NextResponse.json({ error: "Too many attempts. Try later." }, { status: 429 });
    if (ipRl.retryAfterSec) res.headers.set("Retry-After", String(ipRl.retryAfterSec));
    return res;
  }

  try {
    const { firebaseUid, phone } = await verifyFirebaseIdToken(parsed.data.idToken);
    const user = await loginUserFromFirebasePhone({ firebaseUid, phone });
    await logAuthEvent({
      event: "login_firebase",
      userId: user.id,
      ip,
      userAgent: req.headers.get("user-agent") ?? undefined,
      meta: { phone }
    });
    void notifyAuthLogin({ userId: user.id, ip });
    const res = NextResponse.json({ ok: true });
    await createSessionCookie(user.id, res);
    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Auth failed";
    if (msg.includes("Account not found")) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }
    if (msg.includes("already linked")) {
      return NextResponse.json({ error: "Phone already in use" }, { status: 409 });
    }
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
