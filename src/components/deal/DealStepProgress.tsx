"use client";

import { Fragment } from "react";

type Step = 0 | 1 | 2;

function stepFromStatus(status: string): Step {
  if (status === "ON_REVIEW") return 2;
  if (status === "WAIT_PROOF" || status === "REJECTED") return 1;
  return 0;
}

const labels = ["Оплата", "Чек", "Проверка"];

export function DealStepProgress({ status }: { status: string }) {
  const active = stepFromStatus(status);
  return (
    <div className="flex w-full items-center gap-1 sm:gap-1.5" aria-label="Прогресс брони">
      {labels.map((label, i) => (
        <Fragment key={label}>
          {i > 0 ? (
            <div
              className={`h-0.5 w-2 shrink-0 rounded-full sm:w-3 ${active >= i ? "bg-emerald-500/75" : "bg-white/12"}`}
              aria-hidden
            />
          ) : null}
          <div
            className={`flex min-h-[2.35rem] min-w-0 flex-1 flex-col justify-center rounded-xl px-1.5 py-1.5 text-center transition sm:px-2 ${
              active === i
                ? "bg-emerald-500/25 ring-1 ring-emerald-400/45"
                : active > i
                  ? "bg-white/8 ring-1 ring-white/12"
                  : "bg-black/25 ring-1 ring-white/6 opacity-[0.45]"
            }`}
          >
            <span className="text-[9px] font-bold uppercase leading-tight tracking-wide text-emerald-100/95 sm:text-[10px]">
              {label}
            </span>
          </div>
        </Fragment>
      ))}
    </div>
  );
}
