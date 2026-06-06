"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

type Props = {
  status: "ok" | "invalid" | "expired" | "missing";
};

export function VerifyEmailClient({ status }: Props) {
  const router = useRouter();

  useEffect(() => {
    if (status !== "ok") return;
    const t = window.setTimeout(() => {
      router.push("/auth/sign-in");
    }, 3000);
    return () => window.clearTimeout(t);
  }, [status, router]);

  if (status === "ok") {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 shadow-sm">
          <p className="text-2xl font-bold text-emerald-900">✅ Email подтверждён!</p>
          <p className="mt-3 text-sm text-emerald-800">Перенаправляем на страницу входа…</p>
          <Link href="/auth/sign-in" className="mt-6 inline-block text-sm font-semibold text-emerald-700 underline">
            Войти сейчас
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 shadow-sm">
        <p className="text-2xl font-bold text-red-900">❌ Ссылка недействительна или устарела</p>
        <p className="mt-3 text-sm text-red-800">
          {status === "missing" ? "Токен не указан." : "Запросите новую ссылку для подтверждения email."}
        </p>
        <Link
          href="/auth/verify-pending"
          className="mt-6 inline-block rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white"
        >
          Отправить новую ссылку
        </Link>
      </div>
    </main>
  );
}
