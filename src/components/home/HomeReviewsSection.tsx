import Link from "next/link";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { getBookingGuestLabel } from "@/lib/domain/booking";
import { EmptyStateCard } from "@/components/ds";
import { ContentGrid } from "@/components/ds";
import { HomeSectionHeader } from "@/components/home/HomeSectionHeader";

type ReviewRow = {
  id: number;
  rating: number;
  comment: string;
  booking: {
    guestName?: string | null;
    guestPhone?: string | null;
    user?: { name: string | null; phone?: string | null; email?: string | null } | null;
    room: { hotel: { name: string; city: string } };
  };
};

type Props = {
  locale: Locale;
  reviews: ReviewRow[];
};

export function HomeReviewsSection({ locale, reviews }: Props) {
  return (
    <>
      <HomeSectionHeader title={m(locale, "home.reviewsTitle")} align="center" className="!text-center" />
      {reviews.length ? (
        <ContentGrid cols={3} gap="lg" className="mt-2">
          {reviews.map((r) => (
            <blockquote key={r.id} className="home-review-card">
              <div className="flex gap-0.5 text-amber-400" aria-label={m(locale, "home.reviewsStarsAria", { n: r.rating })}>
                {Array.from({ length: r.rating }).map((_, i) => (
                  <span key={i} aria-hidden>
                    ★
                  </span>
                ))}
              </div>
              <p className="mt-4 text-sm leading-relaxed text-[var(--taj-color-text-secondary)]">&ldquo;{r.comment}&rdquo;</p>
              <footer className="mt-4 border-t border-[var(--taj-color-border)] pt-4 text-sm">
                <span className="font-semibold text-[var(--taj-color-text)]">{getBookingGuestLabel(r.booking)}</span>
                <span className="text-[var(--taj-color-text-muted)]"> · {r.booking.room.hotel.city}</span>
              </footer>
            </blockquote>
          ))}
        </ContentGrid>
      ) : (
        <EmptyStateCard
          align="center"
          title={m(locale, "home.reviewsEmpty")}
          description={m(locale, "home.trust1Text")}
          icon="★"
          actions={
            <>
              <Link href="/search" className="taj-btn taj-btn--primary">
                {m(locale, "home.ctaSearch")}
              </Link>
              <Link href="/dashboard/bookings" className="taj-btn taj-btn--secondary">
                {m(locale, "userMenu.bookings")}
              </Link>
            </>
          }
          className="mt-4"
        />
      )}
    </>
  );
}
