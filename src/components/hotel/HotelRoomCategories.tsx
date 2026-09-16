"use client";

import { useState } from "react";
import Link from "next/link";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { RoomPhotoCarousel } from "@/components/RoomPhotoCarousel";
import type { RoomCategoryView, RoomVariantView } from "@/lib/hotel/groupHotelRooms";
import { amenityLabel as labelAmenity } from "@/lib/pms/amenities";
import { RoomPanoramaViewer } from "@/components/hotel/RoomPanoramaViewer";

function amenityLabel(locale: Locale, key: string) {
  return labelAmenity(locale, key.toLowerCase());
}

function PriceLine({
  locale,
  min,
  max
}: {
  locale: Locale;
  min: number;
  max: number;
}) {
  if (!min && !max) return null;
  if (min === max) {
    return (
      <div className="font-semibold text-[var(--taj-color-text)]">
        {m(locale, "search.fromPrice")} {min} TJS
      </div>
    );
  }
  return (
    <div className="font-semibold text-[var(--taj-color-text)]">
      {min}–{max} TJS
    </div>
  );
}

/** `tone` matches the surface this renders on - "light" for the white glass-panel card, "dark"
 *  for the self-contained black/20 variant chip - never assume one shared color works on both. */
function AmenityList({
  locale,
  amenities,
  tone = "light"
}: {
  locale: Locale;
  amenities: string[];
  tone?: "light" | "dark";
}) {
  if (!amenities.length) return null;
  const textClass = tone === "dark" ? "text-brand-200" : "text-[var(--taj-color-text-secondary)]";
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {amenities.map((item) => (
        <span key={item} className={`rounded-full border border-brand-700 px-2 py-0.5 text-[11px] ${textClass}`}>
          {amenityLabel(locale, item)}
        </span>
      ))}
    </div>
  );
}

function BookButton({ href, locale }: { href: string; locale: Locale }) {
  return (
    <Link href={href} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white">
      {m(locale, "search.bookNow")}
    </Link>
  );
}

function SoldOutBadge({ locale }: { locale: Locale }) {
  return (
    <span
      role="status"
      className="inline-flex cursor-not-allowed items-center rounded-lg border border-white/15 bg-black/20 px-4 py-2 text-sm font-medium text-brand-200"
    >
      {m(locale, "hotelPage.soldOut")}
    </span>
  );
}

function VariantCard({
  locale,
  variant,
  soldOut
}: {
  locale: Locale;
  variant: RoomVariantView;
  soldOut: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="font-medium text-white">{variant.title}</div>
      <div className="mt-1 text-sm text-brand-200">
        {m(locale, "owner.capacity")}: {variant.capacity}
      </div>
      <AmenityList locale={locale} amenities={variant.amenities} tone="dark" />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="font-semibold text-white">{variant.price} TJS</div>
        {soldOut ? <SoldOutBadge locale={locale} /> : <BookButton href={variant.bookHref} locale={locale} />}
      </div>
    </div>
  );
}

function CategoryCard({
  locale,
  group
}: {
  locale: Locale;
  group: RoomCategoryView;
}) {
  const [open, setOpen] = useState(false);
  const [panoOpen, setPanoOpen] = useState(false);

  return (
    <div className="glass-panel flex flex-col gap-4 rounded-xl p-4 sm:flex-row sm:items-stretch">
      <div className="w-full shrink-0 sm:max-w-xs sm:min-w-[280px]">
        <RoomPhotoCarousel urls={group.photos} title={group.name} variant="dark" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
        <div>
          <div className="font-semibold text-[var(--taj-color-text)]">{group.name}</div>
          {group.description ? (
            <p className="mt-1 text-sm text-[var(--taj-color-text-secondary)]">{group.description}</p>
          ) : null}
          <p className="mt-2 text-sm text-[var(--taj-color-text-secondary)]">
            {m(locale, "hotelPage.categoryCount", { count: group.count })}
          </p>
          {group.identical && group.capacity != null ? (
            <div className="mt-1 text-sm text-[var(--taj-color-text-secondary)]">
              {m(locale, "owner.capacity")}: {group.capacity}
            </div>
          ) : null}
          {group.identical ? <AmenityList locale={locale} amenities={group.amenities} /> : null}
          {group.panoScenes?.length ? (
            <button
              type="button"
              className="mt-2 rounded-lg border border-brand-500 px-3 py-2 text-sm font-medium text-brand-700"
              onClick={() => setPanoOpen(true)}
            >
              {m(locale, "owner.roomsInv.view360")}
            </button>
          ) : null}
        </div>

        {group.identical ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <PriceLine locale={locale} min={group.minPrice} max={group.maxPrice} />
            {group.soldOut ? (
              <SoldOutBadge locale={locale} />
            ) : group.bookHref ? (
              <BookButton href={group.bookHref} locale={locale} />
            ) : null}
          </div>
        ) : (
          <div className="space-y-3">
            <PriceLine locale={locale} min={group.minPrice} max={group.maxPrice} />
            <button
              type="button"
              className="rounded-lg border border-brand-500 px-4 py-2 text-sm font-medium text-brand-700"
              onClick={() => setOpen((value) => !value)}
            >
              {m(locale, "hotelPage.viewVariants")}
            </button>
            {open ? (
              <div className="space-y-2">
                {group.variants.map((variant) => (
                  <VariantCard key={variant.id} locale={locale} variant={variant} soldOut={group.soldOut} />
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>
      {panoOpen && group.panoScenes?.[0] ? (
        <RoomPanoramaViewer
          url={group.panoScenes[0].url}
          scenes={group.panoScenes}
          locale={locale}
          onClose={() => setPanoOpen(false)}
        />
      ) : null}
    </div>
  );
}

export function HotelRoomCategories({
  locale,
  groups
}: {
  locale: Locale;
  groups: RoomCategoryView[];
}) {
  if (!groups.length) return null;
  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <CategoryCard key={group.key} locale={locale} group={group} />
      ))}
    </div>
  );
}
