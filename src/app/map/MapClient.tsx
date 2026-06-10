"use client";

import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import L from "leaflet";
import "leaflet.markercluster";
import type { Map as LeafletMap, Marker as LeafletMarker, MarkerClusterGroup } from "leaflet";

type LeafletWithCluster = typeof L & {
  markerClusterGroup: (options?: object) => MarkerClusterGroup;
};

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
  focusedHotelId,
  highlightedHotelId,
  onHotelSelect,
  markerRefs
}: {
  hotels: MapHotel[];
  labels: { fromPrice: string; details: string };
  focusedHotelId?: number | null;
  highlightedHotelId?: number | null;
  onHotelSelect?: (hotelId: number) => void;
  markerRefs: MutableRefObject<Record<number, LeafletMarker>>;
}) {
  const map = useMap();

  useEffect(() => {
    const cluster = (L as LeafletWithCluster).markerClusterGroup();
    markerRefs.current = {};

    hotels.forEach((h) => {
      const marker = L.marker([h.latitude, h.longitude], {
        opacity: highlightedHotelId && highlightedHotelId !== h.id ? 0.6 : 1
      });
      marker.bindPopup(`
        <div class="space-y-2 text-sm">
          <div class="font-semibold">${h.name}</div>
          <div class="text-slate-600">${h.city}</div>
          <div>${labels.fromPrice} <span class="font-semibold">${h.fromPrice} TJS</span></div>
          <a class="text-emerald-700 hover:underline" href="/hotel/${h.id}">${labels.details}</a>
        </div>
      `);
      marker.on("click", () => onHotelSelect?.(h.id));
      markerRefs.current[h.id] = marker;
      cluster.addLayer(marker);
    });

    map.addLayer(cluster);
    return () => {
      map.removeLayer(cluster);
      cluster.clearLayers();
    };
  }, [hotels, labels.details, labels.fromPrice, highlightedHotelId, map, markerRefs, onHotelSelect]);

  useEffect(() => {
    if (!focusedHotelId) return;
    const hotel = hotels.find((item) => item.id === focusedHotelId);
    if (!hotel) return;
    map.flyTo([hotel.latitude, hotel.longitude], 11, { duration: 0.7 });
    markerRefs.current[focusedHotelId]?.openPopup();
  }, [focusedHotelId, hotels, map, markerRefs]);

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
  const center: [number, number] = useMemo(() => [38.5, 68.0], []);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRefs = useRef<Record<number, LeafletMarker>>({});

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
            focusedHotelId={focusedHotelId}
            highlightedHotelId={highlightedHotelId}
            onHotelSelect={onHotelSelect}
            markerRefs={markerRefs}
          />
        </MapContainer>
      </div>
      {hotels.length > 0 ? (
        <p className="mt-2 text-xs text-slate-500">
          Маркеры группируются при отдалении — увеличьте масштаб для деталей.
        </p>
      ) : null}
    </div>
  );
}
