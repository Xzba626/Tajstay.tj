import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col items-center justify-center px-4 py-12 text-center">
      <div className="rounded-full border border-slate-700 bg-slate-900/70 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-slate-300">
        404
      </div>
      <h1 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl">Страница не найдена</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
        Возможно, ссылка устарела или страница была перемещена. Вернитесь на главную и продолжите поиск.
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-400">
          На главную
        </Link>
        <Link href="/search" className="rounded-xl border border-slate-600 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800">
          К поиску отелей
        </Link>
      </div>
    </div>
  );
}
