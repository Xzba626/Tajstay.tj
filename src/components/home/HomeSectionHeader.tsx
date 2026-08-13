import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: { href: string; label: string };
  align?: "left" | "center";
  className?: string;
  children?: ReactNode;
};

export function HomeSectionHeader({ eyebrow, title, description, action, align = "left", className, children }: Props) {
  return (
    <header
      className={cn(
        "home-section__header flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        align === "center" && "text-center sm:text-center sm:items-center",
        className
      )}
    >
      <div className={cn("min-w-0", align === "center" && "mx-auto")}>
        {eyebrow ? <p className="home-section__eyebrow">{eyebrow}</p> : null}
        <h2 className="home-section__title">{title}</h2>
        {description ? <p className={cn("home-section__desc", align === "center" && "mx-auto")}>{description}</p> : null}
        {children}
      </div>
      {action ? (
        <Link
          href={action.href}
          className="shrink-0 text-sm font-semibold text-emerald-300 underline-offset-4 transition hover:text-emerald-200 hover:underline"
        >
          {action.label}
        </Link>
      ) : null}
    </header>
  );
}
