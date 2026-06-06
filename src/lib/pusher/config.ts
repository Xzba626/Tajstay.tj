export function isPusherConfigured(): boolean {
  return Boolean(
    process.env.PUSHER_APP_ID &&
      process.env.PUSHER_SECRET &&
      process.env.NEXT_PUBLIC_PUSHER_KEY &&
      process.env.NEXT_PUBLIC_PUSHER_CLUSTER
  );
}

/** Browser-side: public key + cluster only (no server secrets). */
export function isPusherClientConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_PUSHER_KEY && process.env.NEXT_PUBLIC_PUSHER_CLUSTER);
}

export function pusherCluster(): string {
  return process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "eu";
}

export function pusherPublicKey(): string | undefined {
  return process.env.NEXT_PUBLIC_PUSHER_KEY;
}

/** Private channel — requires /api/pusher/auth */
export function bookingChatChannelName(bookingId: number): string {
  return `private-booking-chat-${bookingId}`;
}

export const PUSHER_EVENTS = {
  NEW_MESSAGE: "new-message",
  MESSAGE_READ: "message-read",
  TYPING: "typing"
} as const;
