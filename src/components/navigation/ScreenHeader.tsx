import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
  /** "brandCompact": back-left, green brand surface, white text — opt-in per page, default
   * (title-left/action-right, neutral surface) is unchanged for every other ScreenHeader caller. */
  variant?: "default" | "brandCompact";
  back?: ReactNode;
};

export function ScreenHeader({ title, subtitle, action, className, variant = "default", back }: Props) {
  if (variant === "brandCompact") {
    return (
      <header className={cn("app-screen-header app-screen-header--brand-compact", className)}>
        {back}
        <h1 className="app-screen-header__title">{title}</h1>
        {action ? <div className="app-screen-header__action">{action}</div> : null}
      </header>
    );
  }
  return (
    <header className={cn("app-screen-header", className)}>
      <div className="app-screen-header__text">
        <h1 className="app-screen-header__title">{title}</h1>
        {subtitle ? <p className="app-screen-header__subtitle">{subtitle}</p> : null}
      </div>
      {action ? <div className="app-screen-header__action">{action}</div> : null}
    </header>
  );
}
