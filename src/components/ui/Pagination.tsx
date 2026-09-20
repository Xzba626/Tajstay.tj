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
    /* Was legacy dark-theme styling (`border-white/10 bg-white/5 text-slate-100`) — near-white
       text on a near-transparent white surface, i.e. effectively invisible controls on the light
       Admin/Owner workspaces that are this component's only two consumers. Rebuilt on the shared
       --ts-* tokens so it reads correctly in both Light and Dark. */
    <nav className={cn("flex items-center justify-between gap-3", className)} aria-label="Pagination">
      <div className="text-xs font-medium text-[var(--ts-text-secondary,#66756d)]">
        {page} / {totalPages}
      </div>
      <div className="flex items-center gap-2">
        <Link
          aria-disabled={prevDisabled}
          tabIndex={prevDisabled ? -1 : 0}
          className={cn(
            "rounded-xl border border-[var(--ts-border-default,#dce7e1)] bg-[var(--ts-surface-primary,#ffffff)] px-3 py-2 text-sm font-semibold text-[var(--ts-text-title,#14231b)] transition hover:bg-[var(--ts-surface-muted,#f4f4f5)]",
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
            "rounded-xl border border-[var(--ts-border-default,#dce7e1)] bg-[var(--ts-surface-primary,#ffffff)] px-3 py-2 text-sm font-semibold text-[var(--ts-text-title,#14231b)] transition hover:bg-[var(--ts-surface-muted,#f4f4f5)]",
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

