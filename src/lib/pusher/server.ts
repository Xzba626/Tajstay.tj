import Pusher from "pusher";
import { bookingChatChannelName, isPusherConfigured, PUSHER_EVENTS, pusherCluster } from "@/lib/pusher/config";

let instance: Pusher | null = null;

export function getPusherServer(): Pusher | null {
  if (!isPusherConfigured()) return null;
  if (!instance) {
    instance = new Pusher({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: pusherCluster(),
      useTLS: true
    });
  }
  return instance;
}

export async function triggerBookingChatEvent(
  bookingId: number,
  event: (typeof PUSHER_EVENTS)[keyof typeof PUSHER_EVENTS],
  data: Record<string, unknown>
): Promise<void> {
  const pusher = getPusherServer();
  if (!pusher) return;
  try {
    await pusher.trigger(bookingChatChannelName(bookingId), event, data);
  } catch {
    /* best-effort */
  }
}
