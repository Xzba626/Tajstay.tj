import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true }
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}

