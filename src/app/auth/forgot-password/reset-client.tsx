"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AuthField, MailIcon } from "@/components/auth/AuthField";

async function postJson(url: string, payload: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error((data?.error as string) || "Request failed") as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return data as { success?: boolean; message?: string };
}

export function ForgotPasswordClient({
  labels: L
}: {
  locale: string;
  labels: {
    title: string;
    description: string;
    emailLabel: string;
    submit: string;
    success: string;
    enterCode: string;
    errTooManyAttempts: string;
  };
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    try {
      await postJson("/api/auth/forgot-password", { email: normalizedEmail });
      setStatus("sent");
    } catch (err: unknown) {
      setStatus("error");
      const statusCode = (err as { status?: number })?.status;
      if (statusCode === 429) {
        setError(L.errTooManyAttempts);
      } else {
        setError(err instanceof Error ? err.message : "Error");
      }
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

            {status === "sent" ? (
              <div className="taj-form-notice" role="status">
                {L.success}
              </div>
            ) : null}

            <form onSubmit={onSubmit} className="taj-form-stack" noValidate>
              <AuthField
                id="fp-email"
                label={L.emailLabel}
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="name@example.com"
                autoComplete="email"
                icon={<MailIcon />}
                invalid={status === "error" && !normalizedEmail}
              />

              {status === "error" ? (
                <div className="taj-form-error" role="alert">
                  {error}
                </div>
              ) : null}

              <button type="submit" className="taj-primary-button" disabled={status === "sending"}>
                <span>{L.submit}</span>
              </button>
            </form>

            <p className="taj-bottom-text">
              <Link
                href={
                  normalizedEmail
                    ? `/auth/reset-password?email=${encodeURIComponent(normalizedEmail)}`
                    : "/auth/reset-password"
                }
                className="taj-link-button"
              >
                {L.enterCode}
              </Link>
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}
