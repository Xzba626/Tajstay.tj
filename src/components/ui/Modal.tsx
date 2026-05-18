"use client";

import type { PropsWithChildren } from "react";

type Props = PropsWithChildren<{
  title: string;
  open: boolean;
  onClose: () => void;
}>;

export function Modal({ title, open, onClose, children }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[10050] grid place-items-center bg-black/55 p-4 modal-backdrop">
      <div className="liquid-glass w-full max-w-lg rounded-2xl p-6 modal-surface">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
          <button className="rounded-lg px-2 py-1 text-slate-300 hover:bg-white/10" onClick={onClose} type="button">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
