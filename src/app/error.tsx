"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col items-center justify-center px-4 py-12 text-center">
      <div className="rounded-full border border-rose-400/30 bg-rose-950/40 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-rose-100">
        500
      </div>
      <h1 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl">Что-то пошло не так</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
        Временная ошибка сервера. Попробуйте обновить страницу или повторить действие немного позже.
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-400"
        >
          Попробовать снова
        </button>
        <a href="/" className="rounded-xl border border-slate-600 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800">
          На главную
        </a>
      </div>
    </div>
  );
}
