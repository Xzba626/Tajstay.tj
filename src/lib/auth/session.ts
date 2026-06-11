import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";
import type { NextResponse } from "next/server";
import { clearRoleCookie, setRoleCookie } from "@/lib/auth/sessionRole";

const SESSION_COOKIE = "tajstay_session";

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function getSessionUser(): Promise<User | null> {
  try {
    const cookieStore = cookies();
    const legacyToken = cookieStore.get(SESSION_COOKIE)?.value;
    const authjsToken =
      cookieStore.get("authjs.session-token")?.value ??
      cookieStore.get("__Secure-authjs.session-token")?.value ??
      cookieStore.get("next-auth.session-token")?.value ??
      cookieStore.get("__Secure-next-auth.session-token")?.value;

    if (!legacyToken && !authjsToken) return null;

    let session = legacyToken
      ? await prisma.session.findUnique({
          where: { token: legacyToken },
          include: { user: true }
        })
      : null;

    if (!session && authjsToken) {
      session = await prisma.session.findUnique({
        where: { sessionToken: authjsToken },
        include: { user: true }
      });
    }

    if (!session) return null;
    const sessionExpiry = session.expiresAt ?? session.expires;
    if (!sessionExpiry) return null;
    if (sessionExpiry.getTime() < Date.now()) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
      return null;
    }

    if (session.user.isBanned) return null;
    return session.user;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err ?? "");
    // During build/prerender, Next may throw a dynamic usage error for cookies(). It's expected.
    if (!msg.includes("Dynamic server usage")) {
    console.error("[getSessionUser]", err);
    }
    return null;
  }
}

export async function createSessionCookie(userId: number, res: NextResponse) {
  const token = generateSessionToken();
  const ttlMs = 1000 * 60 * 60 * 24 * 7; // 7 days
  const expiresAt = new Date(Date.now() + ttlMs);
  const isProduction = process.env.NODE_ENV === "production";

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });

  await prisma.session.create({
    data: {
      token,
      sessionToken: token,
      userId,
      expires: expiresAt,
      expiresAt
    }
  });

  if (user?.role) {
    setRoleCookie(res, user.role, expiresAt);
  }

  // Works with NextResponse: res.cookies.set(...)
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    expires: expiresAt
  });
}

export function clearSessionCookie(res: NextResponse) {
  const isProduction = process.env.NODE_ENV === "production";
  clearRoleCookie(res);
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    expires: new Date(0)
  });
}

