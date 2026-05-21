import type { ReactNode } from "react";
import Image from "next/image";
import { cn } from "@/lib/cn";
import { AppCard } from "@/components/ds/AppCard";

/** Presentational property card for owner dashboard (not public search HotelCard). */
type Props = {
  title: string;
  subtitle?: string;
  imageUrl?: string | null;
  imageAlt?: string;
  status?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function PartnerPropertyCard({
  title,
  subtitle,
  imageUrl,
  imageAlt = "",
  status,
  meta,
  actions,
  className
}: Props) {
  return (
    <AppCard variant="elevated" padding="none" className={cn("overflow-hidden", className)}>
      <div className="grid gap-0 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)]">
        <div className="relative aspect-[16/10] min-h-[10rem] bg-[var(--taj-color-bg-elevated)] md:aspect-auto md:min-h-[12rem]">
          {imageUrl ? (
            <Image src={imageUrl} alt={imageAlt || title} fill className="object-cover" sizes="(max-width:768px) 100vw, 320px" />
          ) : (
            <div className="flex h-full min-h-[10rem] items-center justify-center text-sm text-[var(--taj-color-text-muted)]">
              No photo
            </div>
          )}
        </div>
        <div className="flex flex-col p-4 sm:p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-[var(--taj-color-text)]">{title}</h3>
              {subtitle ? <p className="mt-1 text-sm text-[var(--taj-color-text-secondary)]">{subtitle}</p> : null}
            </div>
            {status ? <div className="shrink-0">{status}</div> : null}
          </div>
          {meta ? <div className="mt-3 text-sm text-[var(--taj-color-text-muted)]">{meta}</div> : null}
          {actions ? <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--taj-color-border)] pt-4">{actions}</div> : null}
        </div>
      </div>
    </AppCard>
  );
}
