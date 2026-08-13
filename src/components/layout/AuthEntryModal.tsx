"use client";

import Link from "next/link";
import { useEffect } from "react";
import { X } from "lucide-react";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";

type Props = {
  open: boolean;
  onClose: () => void;
  locale: Locale;
};

export function AuthEntryModal({ open, onClose, locale }: Props) {
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

  if (!open) return null;

  return (
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
    </>
  );
}
