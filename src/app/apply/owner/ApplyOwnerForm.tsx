"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type ApplyOwnerFormLabels = {
  fullName: string;
  phone: string;
  email: string;
  businessName: string;
  documentUrl: string;
  documentUrlHelp: string;
  photoUpload: string;
  photoUploadHelp: string;
  privacyNote: string;
  submit: string;
  sending: string;
  errHttps: string;
};

type Props = {
  labels: ApplyOwnerFormLabels;
};

export function ApplyOwnerForm({ labels }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = e.currentTarget;
    const documentUrlRaw = (form.elements.namedItem("documentUrl") as HTMLInputElement).value.trim();
    if (documentUrlRaw && !documentUrlRaw.toLowerCase().startsWith("https://")) {
      setError(labels.errHttps);
      setLoading(false);
      return;
    }

    const payload = {
      fullName: (form.elements.namedItem("fullName") as HTMLInputElement).value.trim(),
      phone: (form.elements.namedItem("phone") as HTMLInputElement).value.trim(),
      email: (form.elements.namedItem("email") as HTMLInputElement).value.trim(),
      businessName: (form.elements.namedItem("businessName") as HTMLInputElement).value.trim(),
      documentUrl: documentUrlRaw || undefined
    };

    try {
      const res = await fetch("/api/owner/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Ошибка отправки");
      router.push("/dashboard/bookings");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="surface-1 mx-auto w-[94%] max-w-lg space-y-4 rounded-2xl p-4 sm:w-full sm:space-y-5 sm:rounded-3xl sm:p-8">
      <div>
        <label htmlFor="apply-fullName" className="text-sm font-semibold text-slate-200">
          {labels.fullName}
        </label>
        <input
          id="apply-fullName"
          name="fullName"
          required
          autoComplete="name"
          className="ds-input mt-2 w-full"
        />
      </div>
      <div>
        <label htmlFor="apply-phone" className="text-sm font-semibold text-slate-200">
          {labels.phone}
        </label>
        <input
          id="apply-phone"
          name="phone"
          required
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          className="ds-input mt-2 w-full"
        />
      </div>
      <div>
        <label htmlFor="apply-email" className="text-sm font-semibold text-slate-200">
          {labels.email}
        </label>
        <input
          id="apply-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="ds-input mt-2 w-full"
        />
      </div>
      <div>
        <label htmlFor="apply-business" className="text-sm font-semibold text-slate-200">
          {labels.businessName}
        </label>
        <input
          id="apply-business"
          name="businessName"
          required
          autoComplete="organization"
          className="ds-input mt-2 w-full"
        />
      </div>
      <div>
        <label htmlFor="apply-doc" className="text-sm font-semibold text-slate-200">
          {labels.documentUrl}
        </label>
        <input
          id="apply-doc"
          name="documentUrl"
          type="url"
          inputMode="url"
          placeholder="https://..."
          autoComplete="off"
          className="ds-input mt-2 w-full"
          aria-describedby="apply-doc-help"
        />
        <p id="apply-doc-help" className="mt-2 text-xs leading-relaxed text-slate-400">
          {labels.documentUrlHelp}
        </p>
      </div>

      <div>
        <label htmlFor="apply-photos" className="text-sm font-semibold text-slate-200">
          {labels.photoUpload}
        </label>
        <input
          id="apply-photos"
          name="propertyPhotos"
          type="file"
          multiple
          accept="image/*"
          capture="environment"
          className="mt-2 block w-full rounded-2xl border border-white/15 bg-white/5 px-3 py-3 text-sm text-slate-200 file:mr-3 file:rounded-xl file:border-0 file:bg-emerald-500/25 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-emerald-50"
        />
        <p className="mt-2 text-xs leading-relaxed text-slate-400">{labels.photoUploadHelp}</p>
      </div>

      <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs leading-relaxed text-slate-400">
        {labels.privacyNote}
      </p>

      {error ? (
        <div role="alert" className="rounded-2xl border border-red-400/30 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="brand-gradient focus-ring w-full rounded-2xl px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 transition hover:brightness-110 disabled:opacity-60"
      >
        {loading ? labels.sending : labels.submit}
      </button>
    </form>
  );
}
