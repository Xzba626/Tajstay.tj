"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { MapContainer, Marker, Popup, TileLayer, CircleMarker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import type { Marker as LeafletMarker, Map as LeafletMap } from "leaflet";

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
  fromPrice: number;
};

export type MapUserLocation = {
  lat: number;
  lng: number;
};

function haversineKm(a: MapUserLocation, b: { latitude: number; longitude: number }) {
  const toRad = (n: number) => (n * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.lat);
  const dLng = toRad(b.longitude - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export default function MapClient({
  hotels,
  labels,
  heightClass = "h-[520px]",
  focusedHotelId,
  highlightedHotelId,
  onHotelSelect,
  userLocation = null,
  nearbyRadiusKm = 80,
  chrome = "card"
}: {
  hotels: MapHotel[];
  labels: { fromPrice: string; details: string };
  heightClass?: string;
  focusedHotelId?: number | null;
  highlightedHotelId?: number | null;
  onHotelSelect?: (hotelId: number) => void;
  userLocation?: MapUserLocation | null;
  nearbyRadiusKm?: number;
  chrome?: "card" | "plain";
}) {
  const fallbackCenter: [number, number] = useMemo(() => [38.5, 68.0], []);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRefs = useRef<Record<number, LeafletMarker>>({});

  const visibleHotels = useMemo(() => {
    if (!userLocation) return hotels;
    const nearby = hotels.filter((hotel) => haversineKm(userLocation, hotel) <= nearbyRadiusKm);
    return nearby.length ? nearby : hotels;
  }, [hotels, nearbyRadiusKm, userLocation]);

  const center: [number, number] = userLocation
    ? [userLocation.lat, userLocation.lng]
    : fallbackCenter;

  useEffect(() => {
    const timer = window.setTimeout(() => mapRef.current?.invalidateSize(), 80);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.invalidateSize();
    if (userLocation) {
      mapRef.current.flyTo([userLocation.lat, userLocation.lng], 12, { duration: 0.6 });
      return;
    }
    if (!focusedHotelId) return;
    const hotel = visibleHotels.find((item) => item.id === focusedHotelId);
    if (!hotel) return;
    mapRef.current.flyTo([hotel.latitude, hotel.longitude], 11, { duration: 0.7 });
    markerRefs.current[focusedHotelId]?.openPopup();
  }, [focusedHotelId, userLocation, visibleHotels]);

  const shellClass = chrome === "plain" ? "h-full w-full" : "rounded-2xl border bg-white p-3";
  const frameClass = chrome === "plain" ? `${heightClass} overflow-hidden` : `${heightClass} overflow-hidden rounded-xl`;

  return (
    <div className={shellClass}>
      <div className={frameClass}>
        <MapContainer center={center} zoom={userLocation ? 12 : 6} style={{ height: "100%", width: "100%" }} ref={mapRef}>
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {userLocation ? (
            <CircleMarker
              center={[userLocation.lat, userLocation.lng]}
              radius={10}
              pathOptions={{ color: "#22c55e", fillColor: "#4ade80", fillOpacity: 0.9 }}
            />
          ) : null}
          {visibleHotels.map((h) => (
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
                    {labels.fromPrice} <span className="font-semibold">{h.fromPrice} TJS</span>
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
