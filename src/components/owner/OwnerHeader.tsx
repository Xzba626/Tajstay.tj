import Link from "next/link";
import { BrandMark } from "@/components/brand/BrandMark";
import {
  PropertySwitcher,
  type OwnerSidebarLabels,
  type OwnerSwitcherHotel
} from "@/components/dashboard/OwnerSidebar";
import type { Locale } from "@/lib/i18n/locale";

type Props = {
  locale: Locale;
  brandPrimary: string;
  brandFull: string;
  hotels: OwnerSwitcherHotel[];
  labels: OwnerSidebarLabels;
};

/**
 * Canonical Owner mobile header: green brand surface + TajStay mark/wordmark only.
 * Hotel switcher lives in OwnerHotelToolbar (content), not the global header.
 * Language stays in Profile — not Owner chrome.
 * Visible brand text is plain "TajStay" (role context comes from the panel itself, not a header
 * suffix) — `brandFull` ("TajStay Owner") is kept for the link's accessible name/title only.
 */
export function OwnerHeader({
  brandPrimary,
  brandFull,
  hotels,
  labels
}: Props) {
  return (
    <header className="owner-header">
      <div className="owner-header__inner">
        <Link href="/dashboard/owner" className="owner-header__brand" title={brandFull} aria-label={brandFull}>
          <BrandMark showName={false} size="sm" />
          <span className="owner-header__brand-text">{brandPrimary}</span>
        </Link>

        {/* Desktop only — CSS hides on mobile */}
        <div className="owner-header__switcher">
          <PropertySwitcher hotels={hotels} labels={labels} variant="header" />
        </div>
      </div>
    </header>
  );
}

/** Compact hotel switcher for Owner mobile content (not global header). */
export function OwnerHotelToolbar({
  hotels,
  labels
}: {
  hotels: OwnerSwitcherHotel[];
  labels: OwnerSidebarLabels;
}) {
  if (!hotels.length) return null;
  return (
    <div className="owner-hotel-toolbar" data-testid="owner-hotel-toolbar">
      <PropertySwitcher hotels={hotels} labels={labels} variant="header" />
    </div>
  );
}
