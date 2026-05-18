"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ReviewReplyLabels = {
  title: string;
  placeholder: string;
  saving: string;
  submit: string;
  error: string;
};

export default function ReviewReplyForm({ reviewId, labels }: { reviewId: number; labels: ReviewReplyLabels }) {
  const router = useRouter();
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/reviews/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reviewId, reply })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? labels.error);
      router.refresh();
    } catch (err: any) {
      setError(err?.message ?? labels.error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 rounded-xl border bg-white p-4">
      <div className="text-sm font-semibold">{labels.title}</div>
      <textarea
        required
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        placeholder={labels.placeholder}
        className="mt-2 min-h-[90px] w-full rounded-xl border px-3 py-2"
      />
      {error && <div className="mt-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <button disabled={loading} className="mt-3 w-full rounded-xl bg-emerald-700 px-4 py-2 text-sm font-medium text-white">
        {loading ? labels.saving : labels.submit}
      </button>
    </form>
  );
}

