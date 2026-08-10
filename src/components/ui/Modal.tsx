"use client";

import { useEffect, useId, useRef, type PropsWithChildren } from "react";
import { cn } from "@/lib/cn";

type Props = PropsWithChildren<{
  title: string;
  open: boolean;
  onClose: () => void;
  className?: string;
}>;

/**
 * Lightweight modal — Escape + overlay click. Focus returns to previous element on close.
 * z-index from Design System (--z-modal / --z-overlay).
 */
export function Modal({ title, open, onClose, children, className }: Props) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])")?.focus();
    }, 0);

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      previousFocus.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="taj-modal-overlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn("taj-modal-panel", className)}
      >
        <div className="taj-modal-panel__head">
          <h3 id={titleId} className="taj-modal-panel__title">
            {title}
          </h3>
          <button type="button" className="taj-modal-panel__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="taj-modal-panel__body">{children}</div>
      </div>
    </div>
  );
}
