"use client";

import Link from "next/link";
import { useState } from "react";

type Props = {
  initialEmail: string;
};

export function VerifyPendingClient({ initialEmail }: Props) {
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((json as { error?: string }).error ?? "Не удалось отправить письмо");
      }
      if ((json as { emailSkipped?: boolean }).emailSkipped) {
        setMessage("Письмо не отправлено (RESEND не настроен). В dev проверьте логи или настройте RESEND_API_KEY.");
      } else {
        setMessage("Письмо отправлено. Проверьте входящие и папку «Спам».");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center px-4 py-16">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-amber-950">Проверьте ваш email</h1>
        <p className="mt-3 text-sm text-amber-900">
          Мы отправили письмо на <strong>{email || "ваш адрес"}</strong>. Подтвердите email, чтобы войти в аккаунт.
        </p>

        <form onSubmit={handleResend} className="mt-6 space-y-3">
          <label className="block text-sm font-semibold text-amber-950">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 h-11 w-full rounded-xl border border-amber-200 bg-white px-3 text-sm text-slate-900"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? "Отправка…" : "Отправить повторно"}
          </button>
        </form>

        {message ? <p className="mt-4 text-sm text-emerald-800">{message}</p> : null}
        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

        <p className="mt-6 text-center text-sm">
          <Link href="/auth/sign-in" className="font-semibold text-emerald-800 underline">
            Вернуться ко входу
          </Link>
        </p>
      </div>
    </main>
  );
}
