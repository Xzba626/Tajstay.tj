"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";

type Props = {
  open: boolean;
  onClose: () => void;
  locale: Locale;
};

export function AuthEntryModal({ open, onClose, locale }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  // Portal to document.body to escape the .site-header wrapper. That header
  // has `backdrop-filter: blur()`, which per the CSS spec makes it the
  // containing block for every `position: fixed` descendant. Without the
  // portal, `top: 50%` on the modal resolved to 50% of the ~72px header
  // (=36px) instead of 50% of the viewport, so the modal centered on the
  // header and its top edge sat above the visible viewport on small phones —
  // the exact clipping the user reported.
  return createPortal(
    <>
      <div className="auth-entry-modal__backdrop" onClick={onClose} aria-hidden />
      <div className="auth-entry-modal" role="dialog" aria-modal="true" aria-labelledby="auth-entry-title">
        <button type="button" className="auth-entry-modal__close" onClick={onClose} aria-label={m(locale, "common.close")}>
          <X size={20} />
        </button>
        <h2 id="auth-entry-title" className="auth-entry-modal__title">
          {m(locale, "auth.modalTitle")}
        </h2>
        <p className="auth-entry-modal__subtitle">{m(locale, "auth.modalSubtitle")}</p>
        <Link href="/auth/sign-in" className="btn-primary auth-entry-modal__cta" onClick={onClose}>
          {m(locale, "header.signIn")}
        </Link>
        <Link href="/auth/sign-in?mode=register" className="auth-entry-modal__link" onClick={onClose}>
          {m(locale, "auth.tabsRegister")}
        </Link>
      </div>
    </>,
    document.body
  );
}
