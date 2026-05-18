"use client";

import { useCallback, useRef, useState } from "react";

type Props = {
  urls: string[];
  title: string;
  /** Светлая карточка владельца или тёмная на странице отеля */
  variant?: "light" | "dark";
};

const SWIPE_MIN = 48;

export function RoomPhotoCarousel({ urls, title, variant = "light" }: Props) {
  const list = urls.filter(Boolean);
  const [idx, setIdx] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const go = useCallback(
    (delta: number) => {
      if (list.length <= 1) return;
      setIdx((v) => {
        const next = v + delta;
        return ((next % list.length) + list.length) % list.length;
      });
    },
    [list.length]
  );

  if (list.length === 0) {
    return (
      <div
        className={`flex aspect-[16/10] w-full items-center justify-center rounded-xl text-sm ${
          variant === "dark" ? "bg-slate-800/60 text-slate-500" : "bg-slate-100 text-slate-500"
        }`}
      >
        Нет фото
      </div>
    );
  }

  const i = ((idx % list.length) + list.length) % list.length;
  const ring = variant === "dark" ? "ring-white/10" : "ring-slate-200/80";

  return (
    <div
      className={`relative w-full overflow-hidden rounded-xl bg-slate-900 ring-1 ${ring}`}
      onTouchStart={(e) => {
        touchStartX.current = e.changedTouches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const start = touchStartX.current;
        touchStartX.current = null;
        if (start == null || list.length <= 1) return;
        const end = e.changedTouches[0]?.clientX ?? start;
        const dx = end - start;
        if (dx > SWIPE_MIN) go(-1);
        else if (dx < -SWIPE_MIN) go(1);
      }}
    >
      <div className="relative aspect-[16/10] w-full touch-pan-y">
        <img src={list[i]} alt="" className="h-full w-full object-cover" />
        {list.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Предыдущее фото"
              className="absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-xl text-white backdrop-blur-sm transition hover:bg-black/65 active:scale-95"
              onClick={() => go(-1)}
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Следующее фото"
              className="absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-xl text-white backdrop-blur-sm transition hover:bg-black/65 active:scale-95"
              onClick={() => go(1)}
            >
              ›
            </button>
            <div className="absolute bottom-2 left-1/2 z-10 flex max-w-[90%] -translate-x-1/2 flex-wrap justify-center gap-1.5">
              {list.map((_, dot) => (
                <button
                  key={dot}
                  type="button"
                  aria-label={`Фото ${dot + 1}`}
                  className={`h-2 min-w-[8px] rounded-full px-0.5 transition ${dot === i ? "w-6 bg-white" : "w-2 bg-white/45"}`}
                  onClick={() => setIdx(dot)}
                />
              ))}
            </div>
          </>
        )}
      </div>
      <span className="sr-only">{title}</span>
    </div>
  );
}
