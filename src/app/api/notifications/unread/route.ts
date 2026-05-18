import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getUnreadNotificationsCount } from "@/lib/notifications/unread";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ count: 0 }, { status: 200 });

  const count = await getUnreadNotificationsCount(user.id);
  return NextResponse.json({ count }, { status: 200 });
}

