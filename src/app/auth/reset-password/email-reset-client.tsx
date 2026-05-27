"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

async function postJson(url: string, payload: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Request failed");
  return data;
}

export function EmailResetPasswordClient({
  email,
  labels: L
}: {
  locale: string;
  email: string;
  labels: {
    title: string;
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
    setStatus("saving");
    setError(null);
    try {
      await postJson("/api/auth/reset-password", payload);
      setStatus("success");
    } catch (err: unknown) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Error");
    }
  }

  return (
    <main className="taj-auth-page">
      <section className="taj-auth-shell">
        <section className="taj-auth-card">
          <div className="taj-auth-inner">
            <div className="taj-auth-welcome">
              <h1>{L.title}</h1>
              <p>{L.emailLabel}</p>
            </div>

            {status === "success" ? (
              <div className="taj-form-error taj-form-error--success" role="status">
                <div className="font-semibold">{L.success}</div>
                <div className="mt-4">
                  <Link href="/auth/sign-in" className="taj-link-button">
                    {L.goSignIn}
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="taj-form-stack" noValidate>
                <div className="taj-field">
                  <label htmlFor="rp-email">{L.emailLabel}</label>
                  <div className="taj-input-wrap">
                    <input
                      id="rp-email"
                      type="email"
                      required
                      value={emailValue}
                      onChange={(e) => setEmailValue(e.target.value)}
                      autoComplete="email"
                      placeholder="name@example.com"
                    />
                  </div>
                </div>
                <div className="taj-field">
                  <label htmlFor="rp-code">{L.codeLabel}</label>
                  <div className="taj-input-wrap">
                    <input
                      id="rp-code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="123456"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      required
                      minLength={6}
                      maxLength={6}
                    />
                  </div>
                </div>
                <div className="taj-field">
                  <label htmlFor="rp-pass">{L.passwordLabel}</label>
                  <div className="taj-input-wrap">
                    <input id="rp-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
                  </div>
                </div>
                <div className="taj-field">
                  <label htmlFor="rp-pass2">{L.confirmPasswordLabel}</label>
                  <div className="taj-input-wrap">
                    <input
                      id="rp-pass2"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      minLength={8}
                      required
                    />
                  </div>
                </div>

                {status === "error" ? <div className="taj-form-error" role="alert">{error}</div> : null}

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

