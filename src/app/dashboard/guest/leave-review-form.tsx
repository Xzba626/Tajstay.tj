"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";

type LeaveReviewLabels = {
  title: string;
  commentPlaceholder: string;
  imagePlaceholder: string;
  sending: string;
  submit: string;
  error: string;
};

type CriteriaKey = "cleanliness" | "staff" | "location" | "value" | "overall";

function StarRow({
  label,
  value,
  onChange
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-sm text-brand-200">{label}</span>
      <div className="flex gap-1" role="group" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`text-lg leading-none transition ${n <= value ? "text-[var(--brand-star)]" : "text-brand-700"}`}
            aria-pressed={n <= value}
            aria-label={`${n}`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
}

export default function LeaveReviewForm({
  bookingId,
  locale,
  labels
}: {
  bookingId: number;
  locale: Locale;
  labels: LeaveReviewLabels;
}) {
  const router = useRouter();
  const [scores, setScores] = useState<Record<CriteriaKey, number>>({
    cleanliness: 5,
    staff: 5,
    location: 5,
    value: 5,
    overall: 5
  });
  const [comment, setComment] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const criteriaRows: { key: CriteriaKey; label: string }[] = [
    { key: "cleanliness", label: m(locale, "guestDash.reviewCriteriaCleanliness") },
    { key: "staff", label: m(locale, "guestDash.reviewCriteriaStaff") },
    { key: "location", label: m(locale, "guestDash.reviewCriteriaLocation") },
    { key: "value", label: m(locale, "guestDash.reviewCriteriaValue") },
    { key: "overall", label: m(locale, "guestDash.reviewCriteriaOverall") }
  ];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/reviews/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          bookingId,
          criteria: scores,
          comment: comment.trim() || undefined,
          imageUrl: imageUrl || null
        })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? labels.error);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : labels.error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="surface-1 space-y-4 rounded-2xl p-5 ring-1 ring-brand-700 transition"
    >
      <div className="text-sm font-semibold tracking-tight text-white">{labels.title}</div>
      <div className="space-y-3">
        {criteriaRows.map((row) => (
          <StarRow
            key={row.key}
            label={row.label}
            value={scores[row.key]}
            onChange={(n) => setScores((s) => ({ ...s, [row.key]: n }))}
          />
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={labels.commentPlaceholder}
        rows={4}
        className="ds-input min-h-[110px] w-full resize-y py-3 placeholder:text-brand-200"
      />
      <input
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
        type="url"
        inputMode="url"
        placeholder={labels.imagePlaceholder}
        className="ds-input w-full placeholder:text-brand-200"
      />
      {error ? (
        <div role="alert" className="rounded-xl border border-brand-700 bg-brand-800 px-4 py-3 text-sm text-brand-200">
          {error}
        </div>
      ) : null}
      <button
        type="submit"
        disabled={loading}
        className="brand-gradient focus-ring w-full rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-900/30 transition hover:brightness-110 disabled:opacity-60"
      >
        {loading ? labels.sending : labels.submit}
      </button>
    </form>
  );
}
