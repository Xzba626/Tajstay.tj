"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { BodyPortal } from "@/components/navigation/BodyPortal";

type Props = {
  open: boolean;
  title: string;
  ariaLabel: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
};

/** Right-side More drawer: sits between fixed header and bottom nav; does not lock body scroll. */
export function WorkspaceMobileDrawer({ open, title, ariaLabel, onClose, children, className }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <BodyPortal>
      <button
        type="button"
        className="workspace-mobile-drawer__backdrop lg:hidden"
        aria-label={title}
        onClick={onClose}
      />
      <aside
        className={cn("workspace-mobile-drawer lg:hidden", className)}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
      >
        <div className="workspace-mobile-drawer__head">
          <h2 className="workspace-mobile-drawer__title">{title}</h2>
          <button type="button" className="workspace-mobile-drawer__close" onClick={onClose} aria-label="Close">
            <X size={18} aria-hidden />
          </button>
        </div>
        <div className="workspace-mobile-drawer__body">{children}</div>
      </aside>
    </BodyPortal>
  );
}
