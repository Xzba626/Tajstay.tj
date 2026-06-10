"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import L from "leaflet";
import "leaflet.markercluster";
import type { Map as LeafletMap } from "leaflet";

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

function MarkerClusterLayer({
  hotels,
  labels,
  highlightedHotelId,
  onHotelSelect
}: {
  hotels: MapHotel[];
  labels: { fromPrice: string; details: string };
  highlightedHotelId?: number | null;
  onHotelSelect?: (hotelId: number) => void;
}) {
  const map = useMap();

  useEffect(() => {
    const cluster = (L as typeof L & { markerClusterGroup: () => L.MarkerClusterGroup }).markerClusterGroup();
    const markers: L.Marker[] = [];

    hotels.forEach((h) => {
      const marker = L.marker([h.latitude, h.longitude], {
        opacity: highlightedHotelId && highlightedHotelId !== h.id ? 0.6 : 1
      });
      marker.bindPopup(`
        <div style="font-family:system-ui,sans-serif;font-size:14px">
          <div style="font-weight:600">${h.name}</div>
          <div style="color:#64748b">${h.city}</div>
          <div>${labels.fromPrice} <strong>${h.fromPrice} TJS</strong></div>
          <a href="/hotel/${h.id}" style="color:#047857">${labels.details}</a>
        </div>
      `);
      marker.on("click", () => onHotelSelect?.(h.id));
      cluster.addLayer(marker);
      markers.push(marker);
    });

    map.addLayer(cluster);

    if (hotels.length === 1) {
      map.setView([hotels[0]!.latitude, hotels[0]!.longitude], 11);
    } else if (hotels.length > 1) {
      const bounds = L.latLngBounds(hotels.map((h) => [h.latitude, h.longitude] as [number, number]));
      map.fitBounds(bounds.pad(0.15));
    }

    return () => {
      map.removeLayer(cluster);
    };
  }, [map, hotels, labels.fromPrice, labels.details, highlightedHotelId, onHotelSelect]);

  return null;
}

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
  const center: [number, number] = useMemo(() => {
    if (hotels.length) return [hotels[0]!.latitude, hotels[0]!.longitude];
    return [38.5, 68.0];
  }, [hotels]);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    if (!focusedHotelId || !mapRef.current) return;
    const hotel = hotels.find((item) => item.id === focusedHotelId);
    if (!hotel) return;
    mapRef.current.flyTo([hotel.latitude, hotel.longitude], 11, { duration: 0.7 });
  }, [focusedHotelId, hotels]);

  return (
    <div className="rounded-2xl border bg-white p-3">
      <div className={`${heightClass} overflow-hidden rounded-xl`}>
        <MapContainer center={center} zoom={6} style={{ height: "100%", width: "100%" }} ref={mapRef}>
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MarkerClusterLayer
            hotels={hotels}
            labels={labels}
            highlightedHotelId={highlightedHotelId}
            onHotelSelect={onHotelSelect}
          />
        </MapContainer>
      </div>
      {hotels.length ? (
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
          {hotels.slice(0, 5).map((h) => (
            <Link key={h.id} href={`/hotel/${h.id}`} className="rounded-full border px-2 py-1 hover:bg-slate-50">
              {h.name}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
