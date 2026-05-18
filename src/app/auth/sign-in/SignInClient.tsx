"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import type { Locale } from "@/lib/i18n/locale";
import { postLoginRedirect, safeReturnPath } from "@/lib/auth/postLoginRedirect";
import { formatTajikPhoneInput, normalizePhone } from "@/lib/validation/phone";

type ApiUser = { id: number; role: string; name: string; phone: string; email?: string | null };

export type SignInLabels = {
  title: string;
  heading: string;
  leftTitle: string;
  leftSubtitle: string;
  leftBenefit1: string;
  leftBenefit2: string;
  leftBenefit3: string;
  tabsSignIn: string;
  tabsRegister: string;
  emailFormTitle: string;
  loginLabel: string;
  emailPlaceholder: string;
  password: string;
  passwordHint: string;
  passwordPlaceholder: string;
  showPassword: string;
  hidePassword: string;
  signIn: string;
  signInHint: string;
  registerTitle: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  emailOptional: string;
  createAccount: string;
  confirmPassword: string;
  confirmPasswordPlaceholder: string;
  agreeTerms: string;
  errPasswordMismatch: string;
  errTermsRequired: string;
  errorGeneric: string;
  fieldRequired: string;
  promo1: string;
  promo2: string;
  promo3: string;
  resetLinkInPassword: string;
  ownerTabCta: string;
  ownerRegisterHint: string;
  googleSignIn: string;
  googleSignInError: string;
  forgotPassword: string;
  becomeOwner: string;
  createOwnerAccount: string;
  errInvalidCredentials: string;
  errTooManyAttempts: string;
  errPhoneInUse: string;
  errEmailInUse: string;
  errInvalidPayload: string;
  errInvalidOtp: string;
  stepWhoTitle: string;
  stepPhoneTitle: string;
  stepCodeTitle: string;
  roleGuest: string;
  roleOwner: string;
  getCode: string;
  enterCode: string;
  retryIn: string;
  retryNow: string;
  yourName: string;
  createPassword: string;
  continueBtn: string;
  back: string;
};

async function readApiJson(res: Response): Promise<{ error?: string; otp?: string; ok?: boolean }> {
  const text = await res.text();
  if (!text.trim()) {
    return { error: res.ok ? undefined : `Ошибка сервера (${res.status})` };
  }
  try {
    return JSON.parse(text) as { error?: string; otp?: string; ok?: boolean };
  } catch {
    const snippet = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
    return { error: snippet || `Ошибка сервера (${res.status})` };
  }
}

async function postJson<T>(url: string, data: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", accept: "application/json" },
    credentials: "include",
    body: JSON.stringify(data)
  });
  const json = await readApiJson(res);
  if (!res.ok) throw new Error(json.error ?? `Ошибка сервера (${res.status})`);
  return json as T;
}

function parseResetPasswordLink(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (value.startsWith("/auth/reset-password?token=")) return value;
  if (value.includes("/auth/reset-password?token=")) {
    const idx = value.indexOf("/auth/reset-password?token=");
    return value.slice(idx);
  }
  return null;
}

type Props = {
  locale: Locale;
  labels: SignInLabels;
  nextPath?: string | null;
  /** false, если на сервере не заданы GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET */
  googleOAuthEnabled?: boolean;
};

type Tab = "signIn" | "register";

type FieldError = string | null;

export function SignInClient({ locale: _locale, labels: L, nextPath = null, googleOAuthEnabled = false }: Props) {
  const [me, setMe] = useState<ApiUser | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("signIn");

  const [loginId, setLoginId] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginShowPassword, setLoginShowPassword] = useState(false);

  const [regFirstName, setRegFirstName] = useState("");
  const [regLastName, setRegLastName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regAgree, setRegAgree] = useState(false);
  const [regShowPassword, setRegShowPassword] = useState(false);
  const [registerStep, setRegisterStep] = useState<1 | 2 | 3>(1);
  const [registerRole, setRegisterRole] = useState<"guest" | "owner">("owner");
  const [otpCode, setOtpCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [otpRetryIn, setOtpRetryIn] = useState(59);
  const [isLoginSubmitting, setIsLoginSubmitting] = useState(false);
  const [isRegisterSubmitting, setIsRegisterSubmitting] = useState(false);

  const [loginErrors, setLoginErrors] = useState<{ loginId: FieldError; password: FieldError }>({
    loginId: null,
    password: null
  });

  const [regErrors, setRegErrors] = useState<{
    firstName: FieldError;
    lastName: FieldError;
    phone: FieldError;
    password: FieldError;
    confirmPassword: FieldError;
    terms: FieldError;
  }>({
    firstName: null,
    lastName: null,
    phone: null,
    password: null,
    confirmPassword: null,
    terms: null
  });

  const regFullName = useMemo(() => `${regFirstName} ${regLastName}`.trim(), [regFirstName, regLastName]);
  const regPhoneE164 = useMemo(() => formatTajikPhoneInput(regPhone), [regPhone]);
  const otpComplete = otpCode.every((d) => d.trim().length === 1);
  const [otpSending, setOtpSending] = useState(false);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

  function mapApiErrorMessage(raw: string): string {
    const v = (raw || "").toLowerCase();
    if (v.includes("invalid credentials")) return L.errInvalidCredentials;
    if (v.includes("too many attempts")) return L.errTooManyAttempts;
    if (v.includes("phone already in use")) return L.errPhoneInUse;
    if (v.includes("email already in use")) return L.errEmailInUse;
    if (v.includes("invalid payload")) return L.errInvalidPayload;
    if (v.includes("invalid otp")) return L.errInvalidOtp;
    if (v.includes("please wait before requesting")) return "Подождите минуту перед повторным запросом кода.";
    if (v.includes("failed to create otp")) return L.errorGeneric;
    if (v.includes("bad request")) return L.errorGeneric;
    return raw || L.errorGeneric;
  }

  async function sendRegistrationOtp(goToStep3: boolean) {
    if (!regPhone.trim()) {
      setRegErrors((prev) => ({ ...prev, phone: L.fieldRequired }));
      return;
    }
    const phone = regPhoneE164;
    if (!phone) {
      setFormError(L.errInvalidPayload);
      return;
    }
    setOtpSending(true);
    setFormError(null);
    if (goToStep3) setDevOtpHint(null);
    try {
      const res = await fetch("/api/phone-otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json", accept: "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone })
      });
      const json = await readApiJson(res);
      if (!res.ok) throw new Error(json.error ?? `Ошибка сервера (${res.status})`);
      if (typeof json.otp === "string" && json.otp) setDevOtpHint(json.otp);
      setOtpRetryIn(59);
      setOtpCode(["", "", "", "", "", ""]);
      if (goToStep3) setRegisterStep(3);
    } catch (err: unknown) {
      setFormError(mapApiErrorMessage(err instanceof Error ? err.message : ""));
    } finally {
      setOtpSending(false);
    }
  }

  async function refreshMe() {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    const json = await res.json().catch(() => ({}));
    setMe(json.user ?? null);
  }

  useEffect(() => {
    refreshMe().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!me) return;
    window.location.href = postLoginRedirect(me.role, nextPath);
  }, [me, nextPath]);

  useEffect(() => {
    if (registerStep !== 3) return;
    if (otpRetryIn <= 0) return;
    const timer = window.setTimeout(() => setOtpRetryIn((v) => Math.max(0, v - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [registerStep, otpRetryIn]);

  async function handleGoogleSignIn() {
    if (!googleOAuthEnabled) return;
    const n = safeReturnPath(nextPath);
    const callbackUrl =
      n && !n.startsWith("/dashboard/admin") && !n.startsWith("/dashboard/owner") ? n : "/dashboard/guest";
    await signIn("google", { callbackUrl });
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    if (isLoginSubmitting) return;
    setFormError(null);
    setLoginErrors({ loginId: null, password: null });
    setIsLoginSubmitting(true);
    try {
      const trimmed = loginId.trim();
      const nextErrors = { loginId: null as FieldError, password: null as FieldError };
      if (!trimmed) nextErrors.loginId = L.fieldRequired;
      if (!loginPassword) {
        nextErrors.password = L.fieldRequired;
      } else {
        const resetLink = parseResetPasswordLink(loginPassword);
        if (resetLink) {
          setFormError(L.resetLinkInPassword);
          window.location.href = resetLink;
          return;
        }
      }
      setLoginErrors(nextErrors);
      if (nextErrors.loginId || nextErrors.password) return;

      const body = trimmed.includes("@")
        ? { email: trimmed.toLowerCase(), password: loginPassword }
        : { phone: trimmed, password: loginPassword };
      await postJson("/api/auth/email/login", body);
      await refreshMe();
    } catch (err: unknown) {
      setFormError(mapApiErrorMessage(err instanceof Error ? err.message : ""));
    } finally {
      setIsLoginSubmitting(false);
    }
  }

  async function handleEmailRegister(e: React.FormEvent) {
    e.preventDefault();
    if (isRegisterSubmitting) return;
    setFormError(null);
    setRegErrors({ firstName: null, lastName: null, phone: null, password: null, confirmPassword: null, terms: null });
    setIsRegisterSubmitting(true);
    try {
      const nextErrors = {
        firstName: regFirstName.trim() ? null : L.fieldRequired,
        lastName: regLastName.trim() ? null : L.fieldRequired,
        phone: regPhone.trim() ? null : L.fieldRequired,
        password: regPassword ? null : L.fieldRequired,
        confirmPassword: null as FieldError,
        terms: regAgree ? null : L.errTermsRequired
      };

      if (regPassword && regConfirmPassword && regPassword !== regConfirmPassword) {
        nextErrors.confirmPassword = L.errPasswordMismatch;
      } else if (!regConfirmPassword) {
        nextErrors.confirmPassword = L.fieldRequired;
      }

      setRegErrors(nextErrors);
      if (Object.values(nextErrors).some(Boolean)) return;
      if (!otpComplete) {
        setFormError(L.enterCode);
        return;
      }

      await postJson("/api/auth/email/register", {
        name: regFullName.trim(),
        phone: regPhoneE164,
        email: regEmail.trim() ? regEmail.trim().toLowerCase() : undefined,
        password: regPassword,
        otp: otpCode.join(""),
        role: registerRole === "owner" ? "OWNER" : "GUEST"
      });
      await refreshMe();
    } catch (err: unknown) {
      setFormError(mapApiErrorMessage(err instanceof Error ? err.message : ""));
    } finally {
      setIsRegisterSubmitting(false);
    }
  }

  function updateOtp(idx: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    setOtpCode((prev) => {
      const next = [...prev];
      next[idx] = digit;
      return next;
    });
    if (digit && idx < 5) {
      const nextInput = document.getElementById(`otp-${idx + 1}`) as HTMLInputElement | null;
      nextInput?.focus();
    }
  }

  return (
    <div className="mx-auto flex w-[94%] max-w-6xl justify-center px-0 py-6 sm:w-full sm:px-6 sm:py-10 lg:px-8">
      <div className="grid gap-5 sm:gap-8 lg:grid-cols-2 lg:items-stretch">
        <section className="surface-1 relative overflow-hidden rounded-3xl p-5 sm:rounded-[28px] sm:p-8 lg:p-10" data-reveal data-stagger="20">

          <Link href="/" className="inline-flex min-w-0 items-center gap-3 rounded-2xl outline-none transition hover:opacity-90">
            <Image src="/logo-mark.svg" alt="TajStay" width={56} height={56} className="h-12 w-12 rounded-2xl sm:h-14 sm:w-14" unoptimized priority />
            <div className="min-w-0">
              <div className="truncate text-lg font-semibold tracking-tight text-white sm:text-xl">TajStay</div>
              <div className="text-sm text-brand-200">{L.title}</div>
            </div>
          </Link>

          <h1 className="mt-6 text-[clamp(1.6rem,7vw,2.25rem)] font-extrabold leading-tight tracking-tight text-white sm:mt-8">
            {L.leftTitle}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-brand-200">{L.leftSubtitle}</p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[L.promo1, L.promo2, L.promo3].map((item) => (
              <div key={item} className="liquid-glass rounded-xl px-3 py-2 text-xs font-semibold text-white">
                {item}
              </div>
            ))}
          </div>

          <ul className="mt-8 space-y-3 text-sm text-brand-200">
            {[L.leftBenefit1, L.leftBenefit2, L.leftBenefit3].map((b) => (
              <li key={b} className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-700 text-white ring-1 ring-brand-600">
                  ✓
                </span>
                <span className="leading-snug">{b}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="surface-1 rounded-3xl p-4 sm:rounded-[28px] sm:p-8" data-reveal data-stagger="80">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-white">{L.heading}</div>
              <div className="mt-1 text-xs text-brand-200">{tab === "signIn" ? L.emailFormTitle : L.registerTitle}</div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl bg-brand-900 p-1">
            <div className="grid grid-cols-2">
              <button
                type="button"
                onClick={() => setTab("signIn")}
                className={`rounded-[14px] px-2 py-2 text-xs font-semibold transition sm:px-4 sm:text-sm ${
                  tab === "signIn" ? "bg-brand-500 text-white shadow-sm" : "text-brand-200 hover:text-white"
                }`}
                aria-current={tab === "signIn" ? "true" : undefined}
              >
                {L.tabsSignIn}
              </button>
              <button
                type="button"
                onClick={() => setTab("register")}
                className={`rounded-[14px] px-2 py-2 text-xs font-semibold transition sm:px-4 sm:text-sm ${
                  tab === "register" ? "bg-brand-500 text-white shadow-sm" : "text-brand-200 hover:text-white"
                }`}
                aria-current={tab === "register" ? "true" : undefined}
              >
                {L.ownerTabCta}
              </button>
            </div>
          </div>

          {formError && <div className="mt-4 rounded-2xl border border-brand-700 bg-brand-800 p-3 text-sm text-brand-200">{formError}</div>}

          {tab === "signIn" ? (
            <form onSubmit={handleEmailLogin} className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-white">{L.loginLabel}</label>
                <input
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder={L.emailPlaceholder}
                  className="h-12 min-h-[48px] w-full rounded-2xl border border-brand-700 bg-brand-900 px-4 text-sm text-white outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
                  autoComplete="username"
                />
                {loginErrors.loginId && <div className="mt-1.5 text-xs font-medium text-brand-200">{loginErrors.loginId}</div>}
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <label className="mb-1.5 block text-sm font-semibold text-white">{L.password}</label>
                  <button
                    type="button"
                    onClick={() => setLoginShowPassword((v) => !v)}
                    className="text-xs font-semibold text-brand-200 hover:text-white"
                  >
                    {loginShowPassword ? L.hidePassword : L.showPassword}
                  </button>
                </div>
                <input
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  type={loginShowPassword ? "text" : "password"}
                  placeholder={L.passwordPlaceholder}
                  className="h-12 w-full rounded-2xl border border-brand-700 bg-brand-900 px-4 text-sm text-white outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
                  autoComplete="current-password"
                  autoCorrect="off"
                  autoCapitalize="none"
                />
                {loginErrors.password && <div className="mt-1.5 text-xs font-medium text-brand-200">{loginErrors.password}</div>}
              </div>

              <button
                type="submit"
                disabled={isLoginSubmitting}
                className="brand-gradient h-14 w-full rounded-2xl px-4 text-base font-semibold text-white transition active:scale-[0.99]"
              >
                {isLoginSubmitting ? `${L.signIn}...` : L.signIn}
              </button>

              {googleOAuthEnabled ? (
                <button
                  type="button"
                  onClick={() => {
                    handleGoogleSignIn().catch(() => setFormError(L.googleSignInError));
                  }}
                  className="h-14 w-full rounded-2xl border border-brand-700 bg-brand-800 px-4 text-base font-semibold text-white transition hover:bg-brand-700"
                >
                  {L.googleSignIn}
                </button>
              ) : null}

              <div className="grid gap-2 sm:grid-cols-2">
                <Link
                  href="/auth/reset-password"
                  className="w-full rounded-2xl bg-brand-800 px-4 py-3 text-center text-sm font-semibold text-brand-200 transition hover:bg-brand-700"
                >
                  {L.forgotPassword}
                </Link>
                <Link
                  href="/apply/owner"
                  className="w-full rounded-2xl bg-brand-700 px-4 py-3 text-center text-sm font-semibold text-white ring-1 ring-brand-600 transition hover:bg-brand-600"
                >
                  {L.becomeOwner}
                </Link>
              </div>
            </form>
          ) : (
            <form onSubmit={handleEmailRegister} className="mt-6 space-y-4">
              <div className="flex items-center justify-center gap-2 py-1">
                {[1, 2, 3].map((n) => (
                  <span
                    key={n}
                    className={`h-2.5 w-2.5 rounded-full ${registerStep === n ? "bg-[var(--brand-green)]" : "bg-white/20"}`}
                  />
                ))}
              </div>

              {registerStep === 1 && (
                <div className="space-y-4">
                  <div className="text-center text-lg font-semibold text-white">{L.stepWhoTitle}</div>
                  <div className="grid grid-cols-1 gap-3">
                    <button
                      type="button"
                      onClick={() => setRegisterRole("guest")}
                      className={`rounded-2xl border p-4 text-left transition ${
                        registerRole === "guest"
                          ? "border-[var(--brand-green)] bg-[rgba(34,197,94,0.1)] ring-1 ring-[rgba(34,197,94,0.35)]"
                          : "border-white/10 bg-white/5"
                      }`}
                    >
                      {L.roleGuest}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegisterRole("owner")}
                      className={`rounded-2xl border p-4 text-left transition ${
                        registerRole === "owner"
                          ? "border-[var(--brand-green)] bg-[rgba(34,197,94,0.1)] ring-1 ring-[rgba(34,197,94,0.35)]"
                          : "border-white/10 bg-white/5"
                      }`}
                    >
                      {L.roleOwner}
                    </button>
                  </div>
                  <button type="button" onClick={() => setRegisterStep(2)} className="ds-primary-btn h-12 w-full">
                    {L.continueBtn}
                  </button>
                </div>
              )}

              {registerStep === 2 && (
                <div className="space-y-4">
                  <div className="text-center text-lg font-semibold text-white">{L.stepPhoneTitle}</div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-white">{L.phone}</label>
                    <div className="flex items-center rounded-2xl border border-brand-700 bg-brand-900 px-4">
                      <span className="pr-2 text-lg font-semibold text-[var(--brand-green)]">+992</span>
                      <input
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="90 000 00 00"
                        className="h-14 w-full bg-transparent text-base text-white outline-none"
                        required
                      />
                    </div>
                    {regErrors.phone && <div className="mt-1.5 text-xs font-medium text-brand-200">{regErrors.phone}</div>}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setRegisterStep(1)} className="rounded-xl border border-white/10 bg-white/5 py-2 text-sm">
                      {L.back}
                    </button>
                    <button
                      type="button"
                      disabled={otpSending}
                      onClick={() => void sendRegistrationOtp(true)}
                      className="ds-primary-btn h-11 w-full disabled:opacity-60"
                    >
                      {otpSending ? `${L.getCode}…` : L.getCode}
                    </button>
                  </div>
                </div>
              )}

              {registerStep === 3 && (
                <div className="space-y-4">
                  <div className="text-center text-lg font-semibold text-white">{L.stepCodeTitle}</div>
                  <div className="flex justify-center gap-2">
                    {otpCode.map((d, idx) => (
                      <input
                        key={idx}
                        id={`otp-${idx}`}
                        value={d}
                        inputMode="numeric"
                        maxLength={1}
                        onChange={(e) => updateOtp(idx, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Backspace" && !otpCode[idx] && idx > 0) {
                            const prevInput = document.getElementById(`otp-${idx - 1}`) as HTMLInputElement | null;
                            prevInput?.focus();
                          }
                        }}
                        className={`h-[52px] w-[52px] rounded-[10px] border text-center text-xl font-bold outline-none ${
                          d
                            ? "border-[var(--brand-green)] bg-[rgba(34,197,94,0.1)] text-[var(--brand-green-light)]"
                            : "border-white/15 bg-white/5 text-white"
                        }`}
                      />
                    ))}
                  </div>
                  <div className="text-center text-xs text-brand-200">
                    {otpRetryIn > 0 ? (
                      `${L.retryIn} ${otpRetryIn}с`
                    ) : (
                      <button
                        type="button"
                        disabled={otpSending}
                        className="text-[var(--brand-green)] disabled:opacity-60"
                        onClick={() => void sendRegistrationOtp(false)}
                      >
                        {otpSending ? "…" : L.retryNow}
                      </button>
                    )}
                  </div>
                  {devOtpHint ? (
                    <div className="rounded-xl border border-brand-600 bg-brand-800/80 px-3 py-2 text-center text-xs text-brand-200">
                      Dev: SMS code <span className="font-mono text-white">{devOtpHint}</span>
                    </div>
                  ) : null}

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-white">{L.firstName}</label>
                      <input value={regFirstName} onChange={(e) => setRegFirstName(e.target.value)} placeholder={L.yourName} className="h-12 w-full rounded-2xl border border-brand-700 bg-brand-900 px-4 text-sm text-white outline-none" required />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-white">{L.lastName}</label>
                      <input value={regLastName} onChange={(e) => setRegLastName(e.target.value)} placeholder={L.lastName} className="h-12 w-full rounded-2xl border border-brand-700 bg-brand-900 px-4 text-sm text-white outline-none" required />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-white">{L.emailOptional}</label>
                    <input value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder={L.emailOptional} type="email" className="h-12 w-full rounded-2xl border border-brand-700 bg-brand-900 px-4 text-sm text-white outline-none" />
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <label className="mb-1.5 block text-sm font-semibold text-white">{L.password}</label>
                        <button type="button" onClick={() => setRegShowPassword((v) => !v)} className="text-xs font-semibold text-brand-200 hover:text-white">
                          {regShowPassword ? L.hidePassword : L.showPassword}
                        </button>
                      </div>
                      <input value={regPassword} onChange={(e) => setRegPassword(e.target.value)} type={regShowPassword ? "text" : "password"} placeholder={L.createPassword} className="h-12 w-full rounded-2xl border border-brand-700 bg-brand-900 px-4 text-sm text-white outline-none" required minLength={6} />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-white">{L.confirmPassword}</label>
                      <input value={regConfirmPassword} onChange={(e) => setRegConfirmPassword(e.target.value)} type={regShowPassword ? "text" : "password"} placeholder={L.confirmPasswordPlaceholder} className="h-12 w-full rounded-2xl border border-brand-700 bg-brand-900 px-4 text-sm text-white outline-none" required minLength={6} />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="flex items-start gap-3 rounded-2xl border border-brand-700 bg-brand-900 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={regAgree}
                    onChange={(e) => setRegAgree(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-brand-600 text-brand-500"
                  />
                  <span className="text-sm font-medium text-brand-200">{L.agreeTerms}</span>
                </label>
                {regErrors.terms && <div className="mt-1.5 text-xs font-medium text-brand-200">{regErrors.terms}</div>}
              </div>

              <button type="submit" disabled={isRegisterSubmitting || !otpComplete} className="brand-gradient h-14 w-full rounded-2xl px-4 text-base font-semibold text-white transition active:scale-[0.99] disabled:opacity-50">
                {isRegisterSubmitting ? `${L.createOwnerAccount}...` : L.createOwnerAccount}
              </button>

              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setTab("signIn")}
                  className="w-full rounded-2xl bg-brand-800 px-4 py-3 text-sm font-semibold text-brand-200 transition hover:bg-brand-700"
                >
                  {L.tabsSignIn}
                </button>
                <Link
                  href="/apply/owner"
                  className="w-full rounded-2xl bg-brand-700 px-4 py-3 text-center text-sm font-semibold text-white ring-1 ring-brand-600 transition hover:bg-brand-600"
                >
                  {L.becomeOwner}
                </Link>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
