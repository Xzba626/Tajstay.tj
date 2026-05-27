"use client";

import { useEffect, useState } from "react";

type Props = {
  text: string;
  acceptLabel: string;
  moreLabel: string;
  moreHref?: string;
};

const STORAGE_KEY = "cookie-consent";

export function CookieConsent({ text, acceptLabel, moreLabel, moreHref = "/policy" }: Props) {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved !== "accepted") {
        const t = window.setTimeout(() => setVisible(true), 600);
        return () => window.clearTimeout(t);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  function accept() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "accepted");
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  if (!mounted || !visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie"
      className="cookie-consent"
      data-visible={visible ? "true" : "false"}
    >
      <div className="cookie-consent__inner">
        <p className="cookie-consent__text">{text}</p>
        <div className="cookie-consent__actions">
          <a href={moreHref} className="cookie-consent__more">
            {moreLabel}
          </a>
          <button type="button" onClick={accept} className="cookie-consent__accept">
            {acceptLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
