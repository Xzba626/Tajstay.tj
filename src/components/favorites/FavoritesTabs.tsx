"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";

type Props = {
  labels: { housing: string; destinations: string };
  children: React.ReactNode;
  destinations: React.ReactNode;
};

export function FavoritesTabs({ labels, children, destinations }: Props) {
  const params = useSearchParams();
  const tab = params.get("tab") === "destinations" ? "destinations" : "housing";

  return (
    <>
      <nav className="mockup-segment mb-4">
        <Link
          href="/favorites"
          className={cn("mockup-segment__item", tab === "housing" && "is-active")}
          aria-current={tab === "housing" ? "page" : undefined}
        >
          {labels.housing}
        </Link>
        <Link
          href="/favorites?tab=destinations"
          className={cn("mockup-segment__item", tab === "destinations" && "is-active")}
          aria-current={tab === "destinations" ? "page" : undefined}
        >
          {labels.destinations}
        </Link>
      </nav>
      {tab === "destinations" ? destinations : children}
    </>
  );
}
