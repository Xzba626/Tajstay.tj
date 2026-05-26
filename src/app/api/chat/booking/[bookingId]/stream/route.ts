import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/requireAuth";
import { canAccessBookingChat } from "@/lib/chat/bookingAccess";
import { bookingWithHotelInclude } from "@/lib/pms/prismaIncludes";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: Promise<{ bookingId: string }> }) {
  const user = await requireUser(["GUEST", "OWNER", "ADMIN"]);
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { bookingId: raw } = await ctx.params;
  const bookingId = Number(raw);
  if (!Number.isFinite(bookingId)) return new Response("Bad request", { status: 400 });

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: bookingWithHotelInclude
  });
  if (!booking || !canAccessBookingChat(booking, user)) {
    return new Response("Forbidden", { status: 403 });
  }

  const encoder = new TextEncoder();
  let lastPoll = Date.now();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      send({ type: "connected", bookingId });

      const tick = async () => {
        if (closed) return;
        try {
          const since = new Date(lastPoll);
          lastPoll = Date.now();
          const rows = await prisma.chatMessage.findMany({
            where: {
              bookingId,
              deletedAt: null,
              isArchived: false,
              createdAt: { gt: since }
            },
            orderBy: { createdAt: "asc" },
            take: 30
          });
          if (rows.length) send({ type: "messages", count: rows.length });
        } catch {
          // ignore transient errors
        }
      };

      const interval = setInterval(() => {
        void tick();
      }, 2500);

      req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(interval);
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
