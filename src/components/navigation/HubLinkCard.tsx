import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

type Props = {
  href: string;
  title: string;
  description?: string;
  icon: LucideIcon;
  badge?: string | number;
  className?: string;
};

export function HubLinkCard({ href, title, description, icon: Icon, badge, className }: Props) {
  return (
    <Link href={href} className={cn("app-hub-card", className)}>
      <span className="app-hub-card__icon" aria-hidden>
        <Icon size={20} strokeWidth={1.75} />
      </span>
      <span className="app-hub-card__body">
        <span className="app-hub-card__title">{title}</span>
        {description ? <span className="app-hub-card__desc">{description}</span> : null}
      </span>
      {badge !== undefined && badge !== 0 ? (
        <span className="app-hub-card__badge">{typeof badge === "number" && badge > 99 ? "99+" : badge}</span>
      ) : null}
      <ChevronRight className="app-hub-card__chevron" size={18} aria-hidden />
    </Link>
  );
}
