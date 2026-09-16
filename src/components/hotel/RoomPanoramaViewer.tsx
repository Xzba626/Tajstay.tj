"use client";

import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";

type Props = {
  url: string;
  locale: Locale;
  onClose: () => void;
  scenes?: { url: string; label: string }[];
};

/**
 * Equirectangular 360° viewer (CSS panorama drag).
 * Not photogrammetry / mesh 3D — honest product terminology: 360° overview.
 */
export function RoomPanoramaViewer({ url, locale, onClose, scenes }: Props) {
  const [yaw, setYaw] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [active, setActive] = useState(0);
  const drag = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null);
  const list = scenes?.length ? scenes : [{ url, label: m(locale, "owner.roomsInv.panoSceneDefault") }];
  const current = list[Math.min(active, list.length - 1)];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function onPointerDown(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, yaw, pitch };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    setYaw(drag.current.yaw + dx * 0.25);
    setPitch(Math.max(-30, Math.min(30, drag.current.pitch - dy * 0.15)));
  }
  function onPointerUp() {
    drag.current = null;
  }

  return (
    <div className="room-pano" role="dialog" aria-modal="true" aria-label={m(locale, "owner.roomsInv.view360")}>
      <div className="room-pano__bar">
        <span className="room-pano__title">{m(locale, "owner.roomsInv.view360")}</span>
        <button type="button" className="owner-btn owner-btn--secondary" onClick={onClose}>
          {m(locale, "owner.roomsInv.close360")}
        </button>
      </div>
      {list.length > 1 ? (
        <div className="room-pano__scenes">
          {list.map((s, i) => (
            <button
              key={s.url + i}
              type="button"
              className={`room-pano__scene${i === active ? " is-on" : ""}`}
              onClick={() => {
                setActive(i);
                setYaw(0);
                setPitch(0);
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      ) : null}
      <div
        className="room-pano__stage"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className="room-pano__img"
          style={{
            backgroundImage: `url(${current.url})`,
            transform: `translateX(${-50 + yaw * 0.15}%) translateY(${pitch}px) scale(1.35)`
          }}
        />
        <p className="room-pano__hint">{m(locale, "owner.roomsInv.panoDragHint")}</p>
      </div>
    </div>
  );
}
