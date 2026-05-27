"use client";

import type { ReactNode } from "react";

export function AuthField({
  id,
  label,
  labelExtra,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
  icon,
  toggle,
  invalid,
  inputMode,
  minLength,
  maxLength,
  required: requiredProp
}: {
  id: string;
  label: string;
  labelExtra?: ReactNode;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  icon?: ReactNode;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  minLength?: number;
  maxLength?: number;
  required?: boolean;
  toggle?: { show: boolean; onToggle: () => void; showLabel: string; hideLabel: string };
  invalid?: boolean;
}) {
  const helperId = `${id}-helper`;
  return (
    <div className="taj-field">
      {labelExtra ? (
        <div className="taj-label-row">
          <label htmlFor={id}>{label}</label>
          {labelExtra}
        </div>
      ) : (
        <label htmlFor={id}>{label}</label>
      )}
      <div className={`taj-input-wrap${invalid ? " taj-input-wrap--invalid" : ""}`}>
        {icon}
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
          minLength={minLength}
          maxLength={maxLength}
          required={requiredProp}
          aria-invalid={invalid || undefined}
          aria-describedby={helperId}
        />
        {toggle ? (
          <button
            type="button"
            className="taj-input-icon-button"
            onClick={toggle.onToggle}
            aria-label={toggle.show ? toggle.hideLabel : toggle.showLabel}
          >
            {toggle.show ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        ) : null}
      </div>
      <p id={helperId} className="sr-only">
        {label}
      </p>
    </div>
  );
}

export function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

export function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 1 1 8 0v3" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
      <path d="M9.9 5.1A10.8 10.8 0 0 1 12 5c6 0 10 7 10 7a18.2 18.2 0 0 1-4.1 4.6" />
      <path d="M6.1 6.1C3.7 7.6 2 12 2 12s4 7 10 7a9.8 9.8 0 0 0 2.2-.3" />
    </svg>
  );
}
