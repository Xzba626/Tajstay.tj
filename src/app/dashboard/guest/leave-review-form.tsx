"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type LeaveReviewLabels = {
  title: string;
  rating: string;
  commentPlaceholder: string;
  imagePlaceholder: string;
  sending: string;
  submit: string;
  error: string;
};

export default function LeaveReviewForm({
  bookingId,
  labels
}: {
  bookingId: number;
  labels: LeaveReviewLabels;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
          rating,
          comment,
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
      <label className="block text-sm font-medium text-brand-200">
        {labels.rating}
        <select
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
          className="ds-input mt-2 w-full cursor-pointer text-white"
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n} className="bg-brand-900">
              {n}
            </option>
          ))}
        </select>
      </label>
      <textarea
        required
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
