"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

async function postJson(url: string, payload: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Request failed");
  return data;
}

export function ResetPasswordClient({
  token,
  labels
}: {
  locale: string;
  token: string;
  labels: {
    title: string;
    subtitle: string;
    password: string;
    passwordPlaceholder: string;
    save: string;
    invalid: string;
    success: string;
    goSignIn: string;
  };
}) {
  const [effectiveToken, setEffectiveToken] = useState(() => token.trim());
  useEffect(() => {
    if (effectiveToken) return;
    const sp = new URLSearchParams(window.location.search);
    const qToken = (sp.get("token") ?? "").trim();
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
    const hp = new URLSearchParams(hash);
    const hToken = (hp.get("token") ?? "").trim();
    const next = qToken || hToken;
    if (next) setEffectiveToken(next);
    // Remove token from URL to avoid referer/history leaks.
    if (qToken || hToken) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const valid = useMemo(() => effectiveToken.trim().length >= 10, [effectiveToken]);
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setStatus("saving");
    setError(null);
    try {
      await postJson("/api/auth/reset-password", { token: effectiveToken, password });
      setStatus("success");
    } catch (err: unknown) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Error");
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-12">
      <div>
        <h1 className="text-2xl font-semibold text-white">{labels.title}</h1>
        <p className="mt-2 text-sm text-brand-200">{labels.subtitle}</p>
      </div>

      {!valid ? (
        <div className="rounded-2xl border border-brand-700 bg-brand-800 px-6 py-8 text-center text-brand-200">
          {labels.invalid}
        </div>
      ) : status === "success" ? (
        <div className="rounded-2xl border border-brand-700 bg-brand-800 px-6 py-8 text-white">
          <div className="font-semibold">{labels.success}</div>
          <div className="mt-4">
            <Link href="/auth/sign-in" className="inline-flex rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-400">
              {labels.goSignIn}
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-brand-700 bg-brand-800 p-6 shadow-sm">
          <label className="block text-sm font-medium text-brand-200">
            {labels.password}
            <input
              type="password"
              minLength={6}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={labels.passwordPlaceholder}
              className="mt-1 h-11 w-full rounded-xl border border-brand-700 bg-brand-900 px-3 text-sm text-white outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />
          </label>
          {status === "error" ? <div className="text-sm text-brand-200">{error}</div> : null}
          <button
            type="submit"
            disabled={status === "saving"}
            className="h-11 w-full rounded-xl bg-brand-500 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-400 disabled:opacity-60"
          >
            {labels.save}
          </button>
        </form>
      )}
    </div>
  );
}

