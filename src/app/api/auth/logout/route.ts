import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { clearSessionCookie } from "@/lib/auth/session";

const SESSION_COOKIE = "tajstay_session";

export async function POST() {
  const cookieStore = cookies();
  const legacyToken = cookieStore.get(SESSION_COOKIE)?.value;
  const authSessionToken =
    cookieStore.get("authjs.session-token")?.value ??
    cookieStore.get("__Secure-authjs.session-token")?.value ??
    cookieStore.get("next-auth.session-token")?.value ??
    cookieStore.get("__Secure-next-auth.session-token")?.value;

  if (legacyToken || authSessionToken) {
    await prisma.session
      .deleteMany({
        where: {
          OR: [{ token: legacyToken }, { sessionToken: authSessionToken }]
        }
      })
      .catch(() => undefined);
  }

  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);

  const isProduction = process.env.NODE_ENV === "production";
  for (const name of [
    "authjs.session-token",
    "__Secure-authjs.session-token",
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
    "authjs.csrf-token",
    "__Host-authjs.csrf-token",
    "next-auth.csrf-token",
    "__Host-next-auth.csrf-token"
  ]) {
    res.cookies.set(name, "", {
      httpOnly: name.includes("session-token"),
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      expires: new Date(0)
    });
  }

  return res;
}

