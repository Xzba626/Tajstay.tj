"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { LatLngExpression } from "leaflet";

const DUSHANBE: [number, number] = [38.5598, 68.787];

const LeafletPickerMap = dynamic(() => import("./HotelLocationPickerMap"), {
  ssr: false,
  loading: () => <div className="owner-location-picker__map owner-location-picker__map--loading" />
});

export function HotelLocationPicker({
  defaultLat,
  defaultLng,
  labelHint
}: {
  defaultLat?: number | null;
  defaultLng?: number | null;
  labelHint: string;
}) {
  const initial: LatLngExpression = useMemo(() => {
    if (typeof defaultLat === "number" && typeof defaultLng === "number" && (defaultLat !== 0 || defaultLng !== 0)) {
      return [defaultLat, defaultLng];
    }
    return DUSHANBE;
  }, [defaultLat, defaultLng]);

  const [position, setPosition] = useState<[number, number]>(initial as [number, number]);

  return (
    <div className="owner-location-picker">
      <input type="hidden" name="latitude" value={position[0]} />
      <input type="hidden" name="longitude" value={position[1]} />
      <LeafletPickerMap position={position} onChange={setPosition} />
      <p className="owner-field__hint">{labelHint}</p>
    </div>
  );
}
