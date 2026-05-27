"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AuthField, LockIcon, MailIcon } from "@/components/auth/AuthField";

async function postJson(url: string, payload: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data?.error as string) || "Request failed");
  return data;
}

function mapError(message: string, L: { invalidCode: string; expiredCode: string; passwordMismatch: string }) {
  const m = message.toLowerCase();
  if (m.includes("mismatch")) return L.passwordMismatch;
  if (m.includes("expired")) return L.expiredCode;
  if (m.includes("invalid")) return L.invalidCode;
  return message;
}

export function EmailResetPasswordClient({
  email,
  labels: L
}: {
  locale: string;
  email: string;
  labels: {
    title: string;
    description: string;
    emailLabel: string;
    codeLabel: string;
    passwordLabel: string;
    confirmPasswordLabel: string;
    submit: string;
    success: string;
    invalidCode: string;
    expiredCode: string;
    passwordMismatch: string;
    goSignIn: string;
  };
}) {
  const [emailValue, setEmailValue] = useState(email);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEmailValue(email);
  }, [email]);

  const payload = useMemo(
    () => ({
      email: emailValue.trim().toLowerCase(),
      code: code.trim(),
      password,
      confirmPassword
    }),
    [code, confirmPassword, emailValue, password]
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setStatus("error");
      setError(L.passwordMismatch);
      return;
    }
    setStatus("saving");
    setError(null);
    try {
      await postJson("/api/auth/reset-password", payload);
      setStatus("success");
    } catch (err: unknown) {
      setStatus("error");
      const msg = err instanceof Error ? err.message : "Error";
      setError(mapError(msg, L));
    }
  }

  return (
    <main className="taj-auth-page taj-auth-page--solo">
      <section className="taj-auth-shell taj-auth-shell--solo">
        <section className="taj-auth-card">
          <div className="taj-auth-inner">
            <div className="taj-auth-welcome taj-auth-welcome-compact">
              <h1>{L.title}</h1>
              <p>{L.description}</p>
            </div>

            {status === "success" ? (
              <div className="taj-form-notice" role="status">
                <div>{L.success}</div>
                <p className="taj-bottom-text" style={{ marginTop: "1rem" }}>
                  <Link href="/auth/sign-in" className="taj-link-button">
                    {L.goSignIn}
                  </Link>
                </p>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="taj-form-stack" noValidate>
                <AuthField
                  id="rp-email"
                  label={L.emailLabel}
                  type="email"
                  value={emailValue}
                  onChange={setEmailValue}
                  autoComplete="email"
                  placeholder="name@example.com"
                  icon={<MailIcon />}
                />
                <AuthField
                  id="rp-code"
                  label={L.codeLabel}
                  value={code}
                  onChange={setCode}
                  placeholder="123456"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  minLength={6}
                  maxLength={6}
                  required
                />
                <AuthField
                  id="rp-pass"
                  label={L.passwordLabel}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={setPassword}
                  minLength={8}
                  required
                  icon={<LockIcon />}
                  toggle={{
                    show: showPassword,
                    onToggle: () => setShowPassword((v) => !v),
                    showLabel: "Show password",
                    hideLabel: "Hide password"
                  }}
                />
                <AuthField
                  id="rp-pass2"
                  label={L.confirmPasswordLabel}
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  minLength={8}
                  required
                  icon={<LockIcon />}
                  toggle={{
                    show: showConfirm,
                    onToggle: () => setShowConfirm((v) => !v),
                    showLabel: "Show password",
                    hideLabel: "Hide password"
                  }}
                />

                {status === "error" ? (
                  <div className="taj-form-error" role="alert">
                    {error}
                  </div>
                ) : null}

                <button type="submit" className="taj-primary-button" disabled={status === "saving"}>
                  <span>{L.submit}</span>
                </button>
              </form>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
