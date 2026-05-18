"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";

function withParam(params: URLSearchParams, key: string, value?: string) {
  const next = new URLSearchParams(params);
  if (!value) next.delete(key);
  else next.set(key, value);
  return next;
}

export function Pagination({
  page,
  totalPages,
  param = "page",
  className
}: {
  page: number;
  totalPages: number;
  param?: string;
  className?: string;
}) {
  const pathname = usePathname();
  const search = useSearchParams();

  if (totalPages <= 1) return null;

  const toHref = (p: number) => {
    const next = withParam(new URLSearchParams(search.toString()), param, String(p));
    return `${pathname}?${next.toString()}`;
  };

  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  return (
    <nav className={cn("flex items-center justify-between gap-3", className)} aria-label="Pagination">
      <div className="text-xs font-medium text-slate-400">
        {page} / {totalPages}
      </div>
      <div className="flex items-center gap-2">
        <Link
          aria-disabled={prevDisabled}
          tabIndex={prevDisabled ? -1 : 0}
          className={cn(
            "rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 shadow-sm transition hover:bg-white/10",
            prevDisabled && "pointer-events-none opacity-50"
          )}
          href={toHref(Math.max(1, page - 1))}
        >
          ←
        </Link>
        <Link
          aria-disabled={nextDisabled}
          tabIndex={nextDisabled ? -1 : 0}
          className={cn(
            "rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 shadow-sm transition hover:bg-white/10",
            nextDisabled && "pointer-events-none opacity-50"
          )}
          href={toHref(Math.min(totalPages, page + 1))}
        >
          →
        </Link>
      </div>
    </nav>
  );
}

