import Link from "next/link";
import { BrandMark } from "@/components/brand/BrandMark";
import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";
import {
  PropertySwitcher,
  type OwnerSidebarLabels,
  type OwnerSwitcherHotel
} from "@/components/dashboard/OwnerSidebar";
import type { Locale } from "@/lib/i18n/locale";

type Props = {
  locale: Locale;
  brandPrimary: string;
  brandSecondary: string;
  brandFull: string;
  hotels: OwnerSwitcherHotel[];
  labels: OwnerSidebarLabels;
};

/**
 * Compact Owner workspace header — brand + active hotel switcher.
 * Mirrors AdminHeader density; hotel context lives here so every Owner section
 * keeps identity without a second consumer header.
 */
export function OwnerHeader({
  locale,
  brandPrimary,
  brandSecondary,
  brandFull,
  hotels,
  labels
}: Props) {
  return (
    <header className="owner-header">
      <div className="owner-header__inner">
        <Link href="/dashboard/owner" className="owner-header__brand" title={brandFull} aria-label={brandFull}>
          <BrandMark showName={false} size="sm" />
          <span className="owner-header__brand-text">
            {brandPrimary}
            <span className="owner-header__brand-context"> {brandSecondary}</span>
          </span>
        </Link>

        <div className="owner-header__switcher">
          <PropertySwitcher hotels={hotels} labels={labels} variant="header" />
        </div>

        <div className="owner-header__actions">
          <LocaleSwitcher current={locale} iconOnly className="owner-header__locale" />
        </div>
      </div>
    </header>
  );
}
