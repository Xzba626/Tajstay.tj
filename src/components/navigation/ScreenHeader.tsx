import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
};

export function ScreenHeader({ title, subtitle, action, className }: Props) {
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
