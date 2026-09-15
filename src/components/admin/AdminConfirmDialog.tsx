"use client";

import { useEffect, useId, useRef } from "react";
import { cn } from "@/lib/cn";

type Props = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  variant?: "destructive" | "critical";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Shared TajStay Admin confirmation dialog foundation (ADM-13). Native `window.confirm()` is
 * never used in Admin. Owns focus trap/restore, Escape-to-cancel, and a `busy` state so a
 * double-click can't fire onConfirm twice — callers (BLOCK 6.2+) plug this into individual
 * mutating actions; 6.1 wires it only into the shell-level logout action.
 */
export function AdminConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = "critical",
  busy = false,
  onConfirm,
  onCancel
}: Props) {
  const titleId = useId();
  const descId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const lastFocused = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    lastFocused.current = document.activeElement;
    // 6.1A closure: destructive actions default focus to Cancel, not Confirm — a stray Enter
    // press (e.g. from the click that opened the dialog still echoing) must never complete a
    // destructive action. Non-destructive ("critical" but reversible) actions keep focus on
    // Confirm, matching the original 6.1 behavior.
    (variant === "destructive" ? cancelRef : confirmRef).current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (lastFocused.current instanceof HTMLElement) lastFocused.current.focus();
    };
  }, [open, onCancel, variant]);

  if (!open) return null;

  return (
    <div className="admin-confirm-overlay" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div
        ref={dialogRef}
        className="admin-confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
      >
        <h2 id={titleId} className="admin-confirm-dialog__title">
          {title}
        </h2>
        {description ? (
          <p id={descId} className="admin-confirm-dialog__desc">
            {description}
          </p>
        ) : null}
        <div className="admin-confirm-dialog__actions">
          <button
            ref={cancelRef}
            type="button"
            className="admin-btn admin-btn--secondary"
            onClick={onCancel}
            disabled={busy}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={cn("admin-btn", variant === "destructive" ? "admin-btn--destructive" : "admin-btn--primary")}
            onClick={onConfirm}
            disabled={busy}
            data-loading={busy || undefined}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
