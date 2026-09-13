import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import { AppImage } from "@/components/ui/AppImage";
import ReviewReplyForm from "@/components/ReviewReplyForm";

export type PublicReviewView = {
  id: number;
  rating: number;
  comment: string;
  imageUrl: string | null;
  reply: string | null;
  createdAt: Date;
  booking: { guestName?: string | null; user?: { name?: string | null } | null };
};

export function ReviewCard({
  locale,
  review,
  canReply
}: {
  locale: Locale;
  review: PublicReviewView;
  canReply: boolean;
}) {
  // Deliberately never falls back to phone/email the way the canonical getBookingGuestLabel
  // (owner/admin-facing) does - this renders on a page anyone can view.
  const name = review.booking.guestName?.trim() || review.booking.user?.name?.trim() || "—";
  return (
    <div className="glass-panel rounded-2xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-semibold text-white">
            {m(locale, "profile.rating")}: {review.rating}/5
          </div>
          <div className="text-sm text-brand-200">
            {name} · {new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : locale === "tg" ? "tg-TJ" : "en-US").format(review.createdAt)}
          </div>
          <div className="mt-3 whitespace-pre-wrap text-sm text-brand-200">{review.comment}</div>
          {review.imageUrl && (
            <div className="mt-3">
              <AppImage
                src={review.imageUrl}
                alt="review"
                width={320}
                height={192}
                className="max-h-48 w-auto rounded-xl border border-brand-700 object-cover"
              />
            </div>
          )}
        </div>
      </div>

      {review.reply && (
        <div className="mt-4 rounded-xl border border-brand-700 bg-brand-800 p-4 text-sm">
          <div className="font-semibold text-white">{m(locale, "guestDash.ownerReply")}</div>
          <div className="mt-1 whitespace-pre-wrap text-brand-200">{review.reply}</div>
        </div>
      )}

      {canReply && !review.reply && (
        <ReviewReplyForm
          reviewId={review.id}
          labels={{
            title: m(locale, "guestDash.ownerReply"),
            placeholder: "Write a reply...",
            saving: "Saving...",
            submit: m(locale, "admin.save"),
            error: m(locale, "auth.errorGeneric")
          }}
        />
      )}
    </div>
  );
}
