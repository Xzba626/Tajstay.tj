import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = {
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
  highlight?: "default" | "warning" | "danger" | "info";
};

export function AdminRecordCard({ children, className, footer, highlight = "default" }: Props) {
  return (
    <article className={cn("admin-record-card", highlight !== "default" && `admin-record-card--${highlight}`, className)}>
      <div className="admin-record-card__body">{children}</div>
      {footer ? <div className="admin-record-card__footer">{footer}</div> : null}
    </article>
  );
}
