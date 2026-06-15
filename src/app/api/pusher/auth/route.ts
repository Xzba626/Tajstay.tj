import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireAuth";
import { prisma } from "@/lib/prisma";
import { canAccessBookingChat } from "@/lib/chat/bookingAccess";
import {
  bookingChatChannelName,
  isPusherConfigured,
  userNotifyChannelName
} from "@/lib/pusher/config";
import { getPusherServer } from "@/lib/pusher/server";
import { bookingWithHotelInclude } from "@/lib/pms/prismaIncludes";

export async function POST(req: NextRequest) {
  if (!isPusherConfigured()) {
    return NextResponse.json({ error: "Pusher not configured" }, { status: 503 });
  }

  const user = await requireUser(["GUEST", "OWNER", "ADMIN", "HOTEL_MODERATOR"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.text();
  const params = new URLSearchParams(body);
  const socketId = params.get("socket_id");
  const channelName = params.get("channel_name");

  if (!socketId || !channelName?.startsWith("private-")) {
    return NextResponse.json({ error: "Invalid auth payload" }, { status: 400 });
  }

  const pusher = getPusherServer();
  if (!pusher) return NextResponse.json({ error: "Pusher unavailable" }, { status: 503 });

  if (channelName.startsWith("private-user-notify-")) {
    const userId = Number(channelName.replace("private-user-notify-", ""));
    if (!Number.isFinite(userId) || userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (channelName !== userNotifyChannelName(user.id)) {
      return NextResponse.json({ error: "Invalid channel" }, { status: 400 });
    }
    const auth = pusher.authorizeChannel(socketId, channelName);
    return NextResponse.json(auth);
  }

  if (!channelName.startsWith("private-booking-chat-")) {
    return NextResponse.json({ error: "Invalid channel" }, { status: 400 });
  }

  const bookingId = Number(channelName.replace("private-booking-chat-", ""));
  if (!Number.isFinite(bookingId) || bookingId < 1) {
    return NextResponse.json({ error: "Invalid channel" }, { status: 400 });
  }

  if (channelName !== bookingChatChannelName(bookingId)) {
    return NextResponse.json({ error: "Invalid channel" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: bookingWithHotelInclude
  });
  if (!booking || !(await canAccessBookingChat(booking, user))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const auth = pusher.authorizeChannel(socketId, channelName);
  return NextResponse.json(auth);
}
