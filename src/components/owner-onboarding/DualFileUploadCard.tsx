"use client";

import { useId, useRef, useState } from "react";
import type { DualSlotFiles } from "@/lib/owner/applicationUpload";

type Labels = {
  photoSection: string;
  photoReq: string;
  uploadPhoto: string;
  or: string;
  documentSection: string;
  documentReq: string;
  uploadDocument: string;
  documentBadge: string;
  remove: string;
  required: string;
  optional: string;
};

type Props = {
  name: string;
  label: string;
  hint?: string;
  required?: boolean;
  labels: Labels;
  value: DualSlotFiles;
  onChange: (next: DualSlotFiles) => void;
  error?: string;
};

const PHOTO_ACCEPT = "image/jpeg,image/png,image/webp";
const DOC_ACCEPT = ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function DualFileUploadCard({
  name,
  label,
  hint,
  required,
  labels,
  value,
  onChange,
  error
}: Props) {
  const baseId = useId();
  const photoRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  function clearPreview() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
  }

  function onPhotoChange(file: File | null) {
    clearPreview();
    if (file) setPreview(URL.createObjectURL(file));
    onChange({ photo: file, document: null });
  }

  function onDocumentChange(file: File | null) {
    clearPreview();
    onChange({ photo: null, document: file });
  }

  function clearPhoto() {
    if (photoRef.current) photoRef.current.value = "";
    clearPreview();
    onChange({ ...value, photo: null });
  }

  function clearDocument() {
    if (docRef.current) docRef.current.value = "";
    onChange({ ...value, document: null });
  }

  const filledKind = value.photo ? "photo" : value.document ? "document" : null;

  return (
    <div className="owner-upload-card owner-dual-upload-card">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold text-slate-100">{label}</span>
        <span className="shrink-0 rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-300">
          {required ? labels.required : labels.optional}
        </span>
      </div>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
      {filledKind === "document" ? (
        <p className="mt-1 text-[11px] font-medium text-amber-200/90">{labels.documentBadge}</p>
      ) : null}

      <div className="mt-3 space-y-3">
        <div>
          <p className="text-xs font-semibold text-slate-200">{labels.photoSection}</p>
          <p className="mt-0.5 text-[11px] text-emerald-200/80">{labels.photoReq}</p>
          <input
            ref={photoRef}
            id={`${baseId}-photo`}
            name={`${name}Photo`}
            type="file"
            accept={PHOTO_ACCEPT}
            className="sr-only"
            onChange={(e) => onPhotoChange(e.target.files?.[0] ?? null)}
          />
          {value.photo && preview ? (
            <div className="mt-2 overflow-hidden rounded-xl border border-white/12 bg-black/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="" className="h-28 w-full object-cover sm:h-32" />
              <div className="flex items-center justify-between gap-2 border-t border-white/10 px-3 py-2">
                <span className="truncate text-xs text-slate-300">{value.photo.name}</span>
                <button type="button" onClick={clearPhoto} className="text-xs font-semibold text-red-300 hover:text-red-200">
                  {labels.remove}
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => photoRef.current?.click()} className="owner-upload-dropzone mt-2 w-full">
              <span className="text-xl opacity-70" aria-hidden>
                📷
              </span>
              <span className="mt-2 text-sm font-semibold text-slate-200">{labels.uploadPhoto}</span>
            </button>
          )}
        </div>

        <div className="owner-upload-divider" role="separator">
          {labels.or}
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-200">{labels.documentSection}</p>
          <p className="mt-0.5 text-[11px] text-emerald-200/80">{labels.documentReq}</p>
          <input
            ref={docRef}
            id={`${baseId}-doc`}
            name={`${name}Document`}
            type="file"
            accept={DOC_ACCEPT}
            className="sr-only"
            onChange={(e) => onDocumentChange(e.target.files?.[0] ?? null)}
          />
          {value.document ? (
            <div className="owner-document-file mt-2">
              <span className="text-lg" aria-hidden>
                📄
              </span>
              <span className="min-w-0 flex-1 truncate text-xs text-slate-200">{value.document.name}</span>
              <button type="button" onClick={clearDocument} className="text-xs font-semibold text-red-300 hover:text-red-200">
                {labels.remove}
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => docRef.current?.click()} className="owner-upload-dropzone mt-2 w-full">
              <span className="text-xl opacity-70" aria-hidden>
                📄
              </span>
              <span className="mt-2 text-sm font-semibold text-slate-200">{labels.uploadDocument}</span>
            </button>
          )}
        </div>
      </div>

      {error ? (
        <p className="mt-2 text-xs font-medium text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
