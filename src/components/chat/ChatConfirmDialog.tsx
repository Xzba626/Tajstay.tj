"use client";

import { useEffect, useRef } from "react";

type Props = {
  open: boolean;
  title: string;
  description: string;
  cancelLabel: string;
  confirmLabel: string;
  busy?: boolean;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/** BLOCK 5.6A: minimal reusable confirm dialog for Chat lifecycle actions (cancel booking, admin
 * cancel) — replaces the two hand-rolled `fixed inset-0` dark-glass blocks that had no Escape
 * handling, no focus management, and no dialog semantics. Scoped to Chat only, not a project-wide
 * dialog rewrite; reuses the same visual language as the existing `Modal`/`.modal-surface` system
 * (already forced to light-mode tokens by globals.css) rather than inventing new styling. */
export function ChatConfirmDialog({
  open,
  title,
  description,
  cancelLabel,
  confirmLabel,
  busy = false,
  destructive = true,
  onCancel,
  onConfirm
}: Props) {
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/55"
        onClick={() => {
          if (!busy) onCancel();
        }}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="chat-confirm-title"
        aria-describedby="chat-confirm-desc"
        className="modal-surface liquid-glass relative w-full max-w-md rounded-2xl p-5"
      >
        <div id="chat-confirm-title" className="text-base font-semibold">
          {title}
        </div>
        <div id="chat-confirm-desc" className="mt-2 text-sm text-[var(--taj-color-text-secondary)]">
          {description}
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-xl border border-[var(--taj-color-border)] px-4 py-2 text-sm text-[var(--taj-color-text-secondary)]"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`rounded-xl px-4 py-2 text-sm font-semibold text-white ${destructive ? "bg-red-600" : "bg-[#0f7a4d]"}`}
          >
            {busy ? "…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
