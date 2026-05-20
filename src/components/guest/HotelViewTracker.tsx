"use client";

import { useEffect } from "react";
import { trackRecentHotel } from "@/components/guest/GuestHomeExtras";

export function HotelViewTracker({ hotelId, name, city }: { hotelId: number; name: string; city: string }) {
  useEffect(() => {
    trackRecentHotel({ id: hotelId, name, city });
  }, [hotelId, name, city]);
  return null;
}
