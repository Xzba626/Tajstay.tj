"use client";

import { BookingMessenger } from "@/components/chat/messenger/BookingMessenger";
import type { BookingRoomProps } from "@/components/chat/BookingRoom.types";

export type { BookingRoomProps } from "@/components/chat/BookingRoom.types";

export function BookingRoom(props: BookingRoomProps) {
  return <BookingMessenger {...props} />;
}
