"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import type { Marker as LeafletMarker, Map as LeafletMap } from "leaflet";

// Fix default icon paths in bundlers.
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
});

export type MapHotel = {
  id: number;
  name: string;
  city: string;
  latitude: number;
  longitude: number;
  fromPrice: number | null;
};

export default function MapClient({
  hotels,
  labels,
  heightClass = "h-[520px]",
  focusedHotelId,
  highlightedHotelId,
  onHotelSelect
}: {
  hotels: MapHotel[];
  labels: { fromPrice: string; details: string };
  heightClass?: string;
  focusedHotelId?: number | null;
  highlightedHotelId?: number | null;
  onHotelSelect?: (hotelId: number) => void;
}) {
  const center: [number, number] = useMemo(() => [38.5, 68.0], []);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRefs = useRef<Record<number, LeafletMarker>>({});

  useEffect(() => {
    if (!focusedHotelId || !mapRef.current) return;
    const hotel = hotels.find((item) => item.id === focusedHotelId);
    if (!hotel) return;
    mapRef.current.flyTo([hotel.latitude, hotel.longitude], 11, { duration: 0.7 });
    const marker = markerRefs.current[focusedHotelId];
    marker?.openPopup();
  }, [focusedHotelId, hotels]);

  return (
    <div className="rounded-2xl border bg-white p-3">
      <div className={`${heightClass} overflow-hidden rounded-xl`}>
        <MapContainer center={center} zoom={6} style={{ height: "100%", width: "100%" }} ref={mapRef}>
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {hotels.map((h) => (
            <Marker
              key={h.id}
              position={[h.latitude, h.longitude]}
              ref={(marker) => {
                if (!marker) return;
                markerRefs.current[h.id] = marker;
              }}
              eventHandlers={{
                click: () => onHotelSelect?.(h.id)
              }}
              opacity={highlightedHotelId && highlightedHotelId !== h.id ? 0.6 : 1}
            >
              <Popup>
                <div className="space-y-2 text-sm">
                  <div className="font-semibold">
                    {h.name}
                    {highlightedHotelId === h.id ? " • в фокусе" : ""}
                  </div>
                  <div className="text-slate-600">{h.city}</div>
                  <div>
                    {labels.fromPrice}{" "}
                    <span className="font-semibold">
                      {h.fromPrice != null ? `${h.fromPrice} TJS` : "—"}
                    </span>
                  </div>
                  <Link className="text-emerald-700 hover:underline" href={`/hotel/${h.id}`}>
                    {labels.details}
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

