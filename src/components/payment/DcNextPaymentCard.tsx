"use client";

import { useRef, useState } from "react";

export type DcNextPaymentCardProps = {
  returnUrl: string;
  /** Полная карточка на странице оплаты; компактная — внутри мастера брони (шаг 2). */
  variant?: "standalone" | "embedded";
  /** Сумма к оплате (как на скрине «К оплате: 600.23 TJS»). */
  amountTjs?: number;
  /** Номер кошелька/карты для перевода в DC */
  account?: string;
  /** Подсказка под кнопкой; `null` — не показывать. */
  footerHint?: string | null;
};

const PHONE_DISPLAY = "+992 901 317 727";
const DC_DEEP_LINK = "https://next.dc.tj/";

const DEFAULT_FOOTER =
  "После оплаты загрузите чек ниже на этой странице — владелец проверит и подтвердит бронь.";

export function DcNextPaymentCard({
  returnUrl,
  variant = "standalone",
  amountTjs,
  account = "901317727",
  footerHint
}: DcNextPaymentCardProps) {
  const compact = PHONE_DISPLAY.replace(/\s+/g, "");
  const [copied, setCopied] = useState(false);
  const [opened, setOpened] = useState(false);
  const hiddenCopyRef = useRef<HTMLTextAreaElement | null>(null);

  const copyNumber = async () => {
    let success = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(PHONE_DISPLAY);
        success = true;
      }
    } catch {
      success = false;
    }

    if (!success && hiddenCopyRef.current) {
      try {
        hiddenCopyRef.current.value = PHONE_DISPLAY;
        hiddenCopyRef.current.focus();
        hiddenCopyRef.current.select();
        success = document.execCommand("copy");
        window.getSelection()?.removeAllRanges();
        hiddenCopyRef.current.blur();
      } catch {
        success = false;
      }
    }

    if (!success) {
      window.alert(`Не удалось скопировать. Скопируй вручную: ${PHONE_DISPLAY}`);
      return;
    }

    setCopied(true);
    window.setTimeout(() => setCopied(false), 2800);
  };

  const openDCNext = () => {
    setOpened(true);
    const amount = amountTjs != null && Number.isFinite(amountTjs) ? String(Math.max(0, Math.round(amountTjs))) : "0";
    const p = new URLSearchParams({ amount, account, returnUrl });
    window.location.href = `${DC_DEEP_LINK}?${p.toString()}`;
  };

  const hint =
    footerHint === undefined ? DEFAULT_FOOTER : footerHint;

  const inner = (
    <>
      <textarea
        ref={hiddenCopyRef}
        readOnly
        aria-hidden="true"
        className="pointer-events-none fixed left-[-9999px] top-0 opacity-0"
      />

      <div className="relative rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.95),rgba(6,12,22,0.98))] p-5 text-white shadow-[0_24px_60px_rgba(0,0,0,0.45)] sm:p-6">
        <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-[20px] bg-[linear-gradient(135deg,#22c55e,#166534)] shadow-lg shadow-emerald-900/40 ring-1 ring-white/15">
            <span className="text-xl font-black">DC</span>
          </div>
          <h2 className="text-xl font-black tracking-tight sm:text-[26px]">Душанбе City — DC Next</h2>
          <p className="mt-1.5 text-sm text-emerald-100/75">Скопируй номер и открой приложение</p>
          {amountTjs != null && Number.isFinite(amountTjs) && (
            <p className="mt-3 text-lg font-bold text-white">
              К оплате:{" "}
              <span className="tabular-nums text-emerald-200">
                {amountTjs.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TJS
              </span>
            </p>
          )}
        </div>

        <div
          className={`relative mb-4 overflow-hidden rounded-2xl border p-3.5 transition-colors sm:p-4 ${
            copied ? "border-emerald-400/50 bg-emerald-500/15" : "border-white/10 bg-black/20"
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-200/60">Номер карты</p>
              <p className="mt-1 break-all font-mono text-base font-bold tracking-tight text-white sm:text-lg">{compact}</p>
              <p className="mt-1 text-xs text-emerald-100/90">Мухаммадали Р. А.</p>
            </div>
            <button
              type="button"
              onClick={copyNumber}
              className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold transition active:scale-95 sm:text-sm ${
                copied ? "bg-emerald-500 text-white" : "bg-emerald-100 text-slate-900 hover:bg-white"
              }`}
            >
              {copied ? "✓ OK" : "Copy"}
            </button>
          </div>
        </div>

        {copied && (
          <div className="mb-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-3 text-center text-sm">
            <div className="font-semibold text-emerald-200">Номер скопирован</div>
            <div className="mt-0.5 text-emerald-100/80">Открой DC Next и заверши перевод</div>
          </div>
        )}

        <button
          type="button"
          onClick={openDCNext}
          className={`w-full rounded-2xl px-4 py-3.5 text-base font-bold transition active:scale-[0.99] ${
            copied
              ? "bg-[linear-gradient(135deg,#16a34a,#052e16)] text-white shadow-lg shadow-emerald-950/40"
              : "bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/15"
          }`}
        >
          {copied ? "Открыть DC Next" : "DC Next"}
        </button>

        {opened && <div className="mt-3 text-center text-2xl text-emerald-400/90">↓</div>}

        {hint ? (
          <p className="mt-4 text-center text-xs leading-relaxed text-slate-400">{hint}</p>
        ) : null}
      </div>
    </>
  );

  if (variant === "embedded") {
    return <div className="w-full">{inner}</div>;
  }

  return (
    <div className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(180deg,#03110b_0%,#0a2418_42%,#0c1f17_100%)] px-3 py-5 sm:px-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-0 h-56 w-56 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="absolute -right-16 top-20 h-64 w-64 rounded-full bg-green-600/10 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>
      <div className="relative mx-auto w-full max-w-md">{inner}</div>
    </div>
  );
}
