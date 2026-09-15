import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getNotificationPreference } from "@/lib/notifications/preferences";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const pref = await getNotificationPreference(user.id);
  return NextResponse.json(pref);
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { security?: unknown; bookingUpdates?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.security !== "boolean" || typeof body.bookingUpdates !== "boolean") {
    return NextResponse.json({ error: "security and bookingUpdates must be boolean" }, { status: 400 });
  }

  const pref = await prisma.notificationPreference.upsert({
    where: { userId: user.id },
    create: { userId: user.id, security: body.security, bookingUpdates: body.bookingUpdates },
    update: { security: body.security, bookingUpdates: body.bookingUpdates }
  });

  return NextResponse.json({ security: pref.security, bookingUpdates: pref.bookingUpdates });
}
