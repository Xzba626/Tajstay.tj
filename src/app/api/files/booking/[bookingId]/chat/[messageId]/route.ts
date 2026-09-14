import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeBookingFileRequest } from "@/lib/uploads/fileRouteHelpers";
import { servePrivateFile } from "@/lib/uploads/servePrivateFile";

export async function GET(
  req: NextRequest,
  { params }: { params: { bookingId: string; messageId: string } }
) {
  const result = await authorizeBookingFileRequest(req, params.bookingId, "chat");
  if ("response" in result) return result.response;

  const messageId = Number.parseInt(params.messageId, 10);
  if (!Number.isFinite(messageId) || messageId < 1) {
    return new Response("Not found", { status: 404 });
  }

  // Authorization already confirmed the requester may access this booking; still verify the
  // message actually belongs to it, so one authorized bookingId can't be used to fetch an
  // attachment from a different booking's chat by guessing messageId.
  const message = await prisma.chatMessage.findFirst({
    where: { id: messageId, bookingId: result.booking.id },
    select: { imageUrl: true }
  });
  if (!message) return new Response("Not found", { status: 404 });

  return servePrivateFile(message.imageUrl);
}
