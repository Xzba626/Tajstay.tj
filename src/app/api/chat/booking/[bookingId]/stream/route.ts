import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/requireAuth";
import { canAccessBookingChatAsync } from "@/lib/chat/bookingAccess";
import { bookingWithHotelInclude } from "@/lib/pms/prismaIncludes";

export const dynamic = "force-dynamic";

const STREAM_LIFETIME_MS = 55_000;

export async function GET(req: NextRequest, ctx: { params: Promise<{ bookingId: string }> }) {
  const user = await requireUser(["GUEST", "OWNER", "ADMIN", "MANAGER"]);
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { bookingId: raw } = await ctx.params;
  const bookingId = Number(raw);
  if (!Number.isFinite(bookingId)) return new Response("Bad request", { status: 400 });

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: bookingWithHotelInclude
  });
  if (!booking || !(await canAccessBookingChatAsync(booking, user))) {
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

      const finish = () => {
        if (closed) return;
        closed = true;
        clearInterval(interval);
        clearTimeout(lifetime);
        try {
          controller.close();
        } catch {
          /* already closed by the runtime */
        }
      };

      let tickErrorLogged = false;
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
        } catch (e) {
          if (!tickErrorLogged) {
            tickErrorLogged = true;
            console.error("[chat.stream] poll failed", {
              bookingId,
              error: e instanceof Error ? e.message : String(e)
            });
          }
        }
      };

      const interval = setInterval(() => {
        void tick();
      }, 2500);

      // Unbounded streams keep one serverless invocation and a 2.5s DB polling loop alive per
      // open chat tab until the platform's max duration kills it. End cleanly instead; the client
      // already falls back to interval polling when the stream closes.
      const lifetime = setTimeout(finish, STREAM_LIFETIME_MS);

      req.signal.addEventListener("abort", finish);
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
