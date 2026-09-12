"use client";

import { useCallback, useRef } from "react";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import type { Marker as LeafletMarker } from "leaflet";

L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
});

function ClickToPlace({ onChange }: { onChange: (pos: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      onChange([e.latlng.lat, e.latlng.lng]);
    }
  });
  return null;
}

export default function HotelLocationPickerMap({
  position,
  onChange
}: {
  position: [number, number];
  onChange: (pos: [number, number]) => void;
}) {
  const markerRef = useRef<LeafletMarker | null>(null);

  const onDragEnd = useCallback(() => {
    const marker = markerRef.current;
    if (!marker) return;
    const { lat, lng } = marker.getLatLng();
    onChange([lat, lng]);
  }, [onChange]);

  return (
    <div className="owner-location-picker__map">
      <MapContainer center={position} zoom={13} style={{ height: "100%", width: "100%" }}>
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <ClickToPlace onChange={onChange} />
        <Marker
          position={position}
          draggable
          eventHandlers={{ dragend: onDragEnd }}
          ref={(marker) => {
            markerRef.current = marker;
          }}
        />
      </MapContainer>
    </div>
  );
}
