"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";

function SendPlaneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden width={18} height={18}>
      <path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  );
}

type Props = {
  locale: Locale;
  disabled: boolean;
  sending: boolean;
  onSend: (payload: { text: string; file: File | null }) => Promise<void>;
  onInput?: () => void;
  error?: string | null;
};

const MAX_LINES = 4;
const LINE_HEIGHT_PX = 20;

export function ChatComposeBar({ locale, disabled, sending, onSend, onInput, error }: Props) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const canSubmit = (text.trim().length > 0 || !!file) && !sending && !disabled;

  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const max = LINE_HEIGHT_PX * MAX_LINES + 16;
    el.style.height = `${Math.min(el.scrollHeight, max)}px`;
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [text, resizeTextarea]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(null);
  }, [file]);

  async function submit() {
    if (!canSubmit) return;
    const payload = { text, file };
    setText("");
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
    await onSend(payload);
    resizeTextarea();
  }

  return (
    <div className="messenger-compose">
      {file ? (
        <div className="messenger-compose__preview">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="" className="messenger-compose__preview-img" />
          ) : (
            <span className="messenger-compose__preview-file">{file.name}</span>
          )}
          <button
            type="button"
            className="messenger-compose__preview-remove"
            onClick={() => {
              setFile(null);
              if (fileRef.current) fileRef.current.value = "";
            }}
            aria-label={m(locale, "common.close")}
          >
            ×
          </button>
        </div>
      ) : null}
      <div className="messenger-compose__row">
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,application/pdf"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => fileRef.current?.click()}
          className="messenger-compose__attach"
          aria-label="Прикрепить файл"
        >
          📎
        </button>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            onInput?.();
            resizeTextarea();
          }}
          placeholder={disabled ? "…" : m(locale, "chat.messagePlaceholder")}
          disabled={disabled}
          rows={1}
          className="messenger-compose__input"
          maxLength={1500}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
        />
        <button
          type="button"
          onClick={() => void submit()}
          disabled={!canSubmit}
          className="messenger-compose__send"
          aria-label={m(locale, "chat.send")}
        >
          {sending ? <span className="messenger-compose__send-busy">…</span> : <SendPlaneIcon />}
        </button>
      </div>
      {error ? <div className="messenger-compose__error">{error}</div> : null}
    </div>
  );
}
