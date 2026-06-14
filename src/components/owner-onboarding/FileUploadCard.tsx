"use client";

import { useId, useRef, useState } from "react";

type Props = {
  name: string;
  label: string;
  hint?: string;
  required?: boolean;
  optionalLabel: string;
  requiredLabel: string;
  chooseLabel: string;
  removeLabel: string;
  reqLabel: string;
  error?: string;
  onFileChange: (file: File | null) => void;
};

const ACCEPT = "image/jpeg,image/png,image/webp";

export function FileUploadCard({
  name,
  label,
  hint,
  required,
  optionalLabel,
  requiredLabel,
  chooseLabel,
  removeLabel,
  reqLabel,
  error,
  onFileChange
}: Props) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  function pick() {
    inputRef.current?.click();
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (preview) URL.revokeObjectURL(preview);
    if (file) {
      setPreview(URL.createObjectURL(file));
      setFileName(file.name);
    } else {
      setPreview(null);
      setFileName(null);
    }
    onFileChange(file);
  }

  function clear() {
    if (inputRef.current) inputRef.current.value = "";
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setFileName(null);
    onFileChange(null);
  }

  return (
    <div className="owner-upload-card min-w-0 max-w-full overflow-hidden">
      <div className="flex items-start justify-between gap-2">
        <label htmlFor={id} className="text-sm font-semibold text-slate-100">
          {label}
        </label>
        <span className="shrink-0 rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-300">
          {required ? requiredLabel : optionalLabel}
        </span>
      </div>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
      <p className="mt-1 text-[11px] text-emerald-200/80">{reqLabel}</p>

      <input
        ref={inputRef}
        id={id}
        name={name}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        onChange={onChange}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-err` : undefined}
      />

      {preview ? (
        <div className="mt-3 overflow-hidden rounded-xl border border-white/12 bg-black/20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" className="h-32 max-w-full w-full object-cover sm:h-36" />
          <div className="flex min-w-0 items-center justify-between gap-2 border-t border-white/10 px-3 py-2">
            <span className="min-w-0 flex-1 break-all text-xs text-slate-300">{fileName}</span>
            <button type="button" onClick={clear} className="shrink-0 text-xs font-semibold text-red-300 hover:text-red-200">
              {removeLabel}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={pick}
          className="owner-upload-dropzone mt-3 w-full"
        >
          <span className="text-2xl opacity-70" aria-hidden>
            ↑
          </span>
          <span className="mt-2 text-sm font-semibold text-slate-200">{chooseLabel}</span>
        </button>
      )}

      {error ? (
        <p id={`${id}-err`} className="mt-2 text-xs font-medium text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
