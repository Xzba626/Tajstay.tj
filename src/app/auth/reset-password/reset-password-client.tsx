"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AuthField, LockIcon } from "@/components/auth/AuthField";

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

export function ResetPasswordClient({
  token,
  labels: L
}: {
  locale: string;
  token: string;
  labels: {
    title: string;
    subtitle: string;
    password: string;
    passwordPlaceholder: string;
    save: string;
    invalid: string;
    success: string;
    goSignIn: string;
  };
}) {
  const [effectiveToken, setEffectiveToken] = useState(() => token.trim());
  useEffect(() => {
    if (effectiveToken) return;
    const sp = new URLSearchParams(window.location.search);
    const qToken = (sp.get("token") ?? "").trim();
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
    const hp = new URLSearchParams(hash);
    const hToken = (hp.get("token") ?? "").trim();
    const next = qToken || hToken;
    if (next) setEffectiveToken(next);
    if (qToken || hToken) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const valid = useMemo(() => effectiveToken.trim().length >= 10, [effectiveToken]);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setStatus("saving");
    setError(null);
    try {
      await postJson("/api/auth/reset-password", { token: effectiveToken, password });
      setStatus("success");
    } catch (err: unknown) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Error");
    }
  }

  return (
    <main className="taj-auth-page taj-auth-page--solo">
      <section className="taj-auth-shell taj-auth-shell--solo">
        <section className="taj-auth-card">
          <div className="taj-auth-inner">
            <div className="taj-auth-welcome taj-auth-welcome-compact">
              <h1>{L.title}</h1>
              <p>{L.subtitle}</p>
            </div>

            {!valid ? (
              <div className="taj-form-error" role="alert">
                {L.invalid}
              </div>
            ) : status === "success" ? (
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
                  id="rp-token-password"
                  label={L.password}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={setPassword}
                  placeholder={L.passwordPlaceholder}
                  autoComplete="new-password"
                  icon={<LockIcon />}
                  toggle={{
                    show: showPassword,
                    onToggle: () => setShowPassword((v) => !v),
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
                  <span>{L.save}</span>
                </button>
              </form>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
