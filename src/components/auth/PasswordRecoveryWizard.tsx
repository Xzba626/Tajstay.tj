"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AuthField, LockIcon, MailIcon } from "@/components/auth/AuthField";
import { OtpCodeInput } from "@/components/auth/OtpCodeInput";
import { PasswordStrengthBar } from "@/components/auth/PasswordStrengthBar";

const EMPTY_OTP = ["", "", "", "", "", ""];

type Step = "email" | "otp" | "password" | "success";

function mapRecoveryError(message: string, L: PasswordRecoveryLabels) {
  const m = message.toLowerCase();
  if (m.includes("too many")) return L.errTooManyAttempts;
  if (m.includes("mismatch")) return L.passwordMismatch;
  if (m.includes("expired")) return L.expiredCode;
  if (m.includes("invalid")) return L.invalidCode;
  return message;
}

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
  return data;
}

export type PasswordRecoveryLabels = {
  step1Title: string;
  step1Subtitle: string;
  emailLabel: string;
  continue: string;
  step2Title: string;
  step2SubtitlePrefix: string;
  changeEmail: string;
  step3Title: string;
  step3Subtitle: string;
  passwordLabel: string;
  confirmPasswordLabel: string;
  savePassword: string;
  successTitle: string;
  successSubtitle: string;
  signIn: string;
  invalidCode: string;
  expiredCode: string;
  passwordMismatch: string;
  errTooManyAttempts: string;
  strengthWeak: string;
  strengthFair: string;
  strengthStrong: string;
};

export function PasswordRecoveryWizard({
  initialEmail = "",
  labels: L
}: {
  locale: string;
  initialEmail?: string;
  labels: PasswordRecoveryLabels;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [stepKey, setStepKey] = useState(0);
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState([...EMPTY_OTP]);
  const [verifiedCode, setVerifiedCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState(false);
  const [otpShake, setOtpShake] = useState(false);
  const [otpSuccess, setOtpSuccess] = useState(false);
  const verifyingOtp = useRef(false);

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  const goToStep = useCallback((next: Step) => {
    setStep(next);
    setStepKey((k) => k + 1);
    setError(null);
  }, []);

  useEffect(() => {
    if (step !== "success") return;
    const t = window.setTimeout(() => router.push("/auth/sign-in"), 1800);
    return () => clearTimeout(t);
  }, [step, router]);

  async function onEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!normalizedEmail) return;
    setBusy(true);
    setError(null);
    try {
      await postJson("/api/auth/forgot-password", { email: normalizedEmail });
      setOtp([...EMPTY_OTP]);
      setVerifiedCode("");
      setOtpError(false);
      setOtpSuccess(false);
      goToStep("otp");
    } catch (err: unknown) {
      const statusCode = (err as { status?: number })?.status;
      if (statusCode === 429) {
        setError(L.errTooManyAttempts);
      } else {
        setError(err instanceof Error ? err.message : "Error");
      }
    } finally {
      setBusy(false);
    }
  }

  const verifyOtp = useCallback(
    async (code: string) => {
      if (verifyingOtp.current || code.length !== 6) return;
      verifyingOtp.current = true;
      setBusy(true);
      setOtpError(false);
      setError(null);
      try {
        await postJson("/api/auth/verify-reset-otp", { email: normalizedEmail, code });
        setVerifiedCode(code);
        setOtpSuccess(true);
        window.setTimeout(() => goToStep("password"), 280);
      } catch (err: unknown) {
        setOtpError(true);
        setOtpShake(true);
        setOtp([...EMPTY_OTP]);
        const statusCode = (err as { status?: number })?.status;
        setError(
          statusCode === 429
            ? L.errTooManyAttempts
            : mapRecoveryError(err instanceof Error ? err.message : L.invalidCode, L)
        );
        window.setTimeout(() => setOtpShake(false), 400);
      } finally {
        setBusy(false);
        verifyingOtp.current = false;
      }
    },
    [normalizedEmail, L, goToStep]
  );

  async function onPasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError(L.passwordMismatch);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await postJson("/api/auth/reset-password", {
        email: normalizedEmail,
        code: verifiedCode,
        password,
        confirmPassword
      });
      goToStep("success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error";
      if (msg.toLowerCase().includes("invalid") || msg.toLowerCase().includes("expired")) {
        setOtp([...EMPTY_OTP]);
        setVerifiedCode("");
        goToStep("otp");
      }
      setError(mapRecoveryError(msg, L));
    } finally {
      setBusy(false);
    }
  }

  function backToEmail() {
    setOtp([...EMPTY_OTP]);
    setVerifiedCode("");
    setOtpError(false);
    setOtpSuccess(false);
    goToStep("email");
  }

  return (
    <main className="taj-auth-page taj-auth-page--solo">
      <section className="taj-auth-shell taj-auth-shell--solo">
        <section className="taj-auth-card">
          <div className="taj-auth-inner">
            <div key={stepKey} className="taj-recovery-step">
              {step === "email" ? (
                <>
                  <div className="taj-auth-welcome taj-auth-welcome-compact">
                    <h1>{L.step1Title}</h1>
                    <p>{L.step1Subtitle}</p>
                  </div>
                  <form onSubmit={onEmailSubmit} className="taj-form-stack" noValidate>
                    <AuthField
                      id="recovery-email"
                      label={L.emailLabel}
                      type="email"
                      value={email}
                      onChange={setEmail}
                      placeholder="name@example.com"
                      autoComplete="email"
                      icon={<MailIcon />}
                      invalid={!!error && !normalizedEmail}
                    />
                    {error ? (
                      <div className="taj-form-error" role="alert">
                        {error}
                      </div>
                    ) : null}
                    <button type="submit" className="taj-primary-button" disabled={busy}>
                      <span>{L.continue}</span>
                    </button>
                  </form>
                </>
              ) : null}

              {step === "otp" ? (
                <>
                  <div className="taj-auth-welcome taj-auth-welcome-compact">
                    <div className="taj-recovery-step2-head">
                      <div>
                        <h1>{L.step2Title}</h1>
                        <p className="taj-recovery-email-line">
                          {L.step2SubtitlePrefix}{" "}
                          <strong>{normalizedEmail}</strong>
                        </p>
                      </div>
                      <button type="button" className="taj-link-button taj-recovery-change-email" onClick={backToEmail}>
                        {L.changeEmail}
                      </button>
                    </div>
                  </div>
                  <div className="taj-form-stack">
                    <OtpCodeInput
                      value={otp}
                      onChange={setOtp}
                      onComplete={(code) => void verifyOtp(code)}
                      disabled={busy}
                      loading={busy && !otpSuccess}
                      error={otpError}
                      success={otpSuccess}
                      shake={otpShake}
                      autoFocus
                      variant="auth"
                    />
                    {error ? (
                      <div className="taj-form-error" role="alert">
                        {error}
                      </div>
                    ) : null}
                  </div>
                </>
              ) : null}

              {step === "password" ? (
                <>
                  <div className="taj-auth-welcome taj-auth-welcome-compact">
                    <h1>{L.step3Title}</h1>
                    <p>{L.step3Subtitle}</p>
                  </div>
                  <form onSubmit={onPasswordSubmit} className="taj-form-stack" noValidate>
                    <AuthField
                      id="recovery-pass"
                      label={L.passwordLabel}
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={setPassword}
                      autoComplete="new-password"
                      minLength={8}
                      required
                      icon={<LockIcon />}
                      toggle={{
                        show: showPassword,
                        onToggle: () => setShowPassword((v) => !v),
                        showLabel: "Show",
                        hideLabel: "Hide"
                      }}
                    />
                    <PasswordStrengthBar
                      password={password}
                      labels={{ weak: L.strengthWeak, fair: L.strengthFair, strong: L.strengthStrong }}
                    />
                    <AuthField
                      id="recovery-pass2"
                      label={L.confirmPasswordLabel}
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                      autoComplete="new-password"
                      minLength={8}
                      required
                      icon={<LockIcon />}
                      toggle={{
                        show: showConfirm,
                        onToggle: () => setShowConfirm((v) => !v),
                        showLabel: "Show",
                        hideLabel: "Hide"
                      }}
                    />
                    {error ? (
                      <div className="taj-form-error" role="alert">
                        {error}
                      </div>
                    ) : null}
                    <button type="submit" className="taj-primary-button" disabled={busy}>
                      <span>{L.savePassword}</span>
                    </button>
                  </form>
                </>
              ) : null}

              {step === "success" ? (
                <div className="taj-recovery-success">
                  <div className="taj-recovery-success__icon" aria-hidden>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <h2>{L.successTitle}</h2>
                  <p>{L.successSubtitle}</p>
                  <button type="button" className="taj-primary-button" onClick={() => router.push("/auth/sign-in")}>
                    <span>{L.signIn}</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
