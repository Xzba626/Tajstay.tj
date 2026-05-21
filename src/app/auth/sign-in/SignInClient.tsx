"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import type { Locale } from "@/lib/i18n/locale";
import { postLoginRedirect, safeReturnPath } from "@/lib/auth/postLoginRedirect";
import { formatTajikPhoneInput } from "@/lib/validation/phone";
import {
  confirmFirebasePhoneOtp,
  isFirebaseClientConfigured,
  resetFirebasePhoneAuth,
  sendFirebasePhoneOtp
} from "@/lib/firebase/client";
import { AuthMethodTabs } from "@/components/auth/AuthMethodTabs";
import { OtpVerificationPanel } from "@/components/auth/OtpVerificationPanel";
import { TajikPhoneInput } from "@/components/auth/TajikPhoneInput";

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
  methodPhone: string;
  methodEmail: string;
  signInSubtitle: string;
  registerSubtitle: string;
  loginLabel: string;
  emailPlaceholder: string;
  password: string;
  passwordPlaceholder: string;
  showPassword: string;
  hidePassword: string;
  signIn: string;
  registerTitle: string;
  fullName: string;
  phone: string;
  email: string;
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
  googleSignIn: string;
  googleSignInError: string;
  forgotPassword: string;
  errInvalidCredentials: string;
  errTooManyAttempts: string;
  errPhoneInUse: string;
  errEmailInUse: string;
  errInvalidPayload: string;
  errInvalidOtp: string;
  accountNotFound: string;
  stepCodeTitle: string;
  sentToLabel: string;
  getCode: string;
  enterCode: string;
  retryIn: string;
  retryNow: string;
  createPassword: string;
  otpVerified: string;
  orContinueWith: string;
  back: string;
};

const EMPTY_OTP = ["", "", "", "", "", ""];

async function readApiJson(res: Response): Promise<{ error?: string; otp?: string; ok?: boolean }> {
  const text = await res.text();
  if (!text.trim()) return { error: res.ok ? undefined : `Ошибка сервера (${res.status})` };
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
  googleOAuthEnabled?: boolean;
  firebasePhoneAuthEnabled?: boolean;
};

type MainTab = "signIn" | "register";
type AuthMethod = "phone" | "email";
type PhoneStep = "input" | "otp";

export function SignInClient({
  locale: _locale,
  labels: L,
  nextPath = null,
  googleOAuthEnabled = false,
  firebasePhoneAuthEnabled = false
}: Props) {
  const useFirebaseSms = firebasePhoneAuthEnabled && isFirebaseClientConfigured();

  const [me, setMe] = useState<ApiUser | null>(null);
  const [mainTab, setMainTab] = useState<MainTab>("signIn");
  const [signInMethod, setSignInMethod] = useState<AuthMethod>("phone");
  const [registerMethod, setRegisterMethod] = useState<AuthMethod>("phone");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const [signInPhoneStep, setSignInPhoneStep] = useState<PhoneStep>("input");
  const [registerPhoneStep, setRegisterPhoneStep] = useState<PhoneStep>("input");

  const [loginPhone, setLoginPhone] = useState("");
  const [loginId, setLoginId] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginShowPassword, setLoginShowPassword] = useState(false);
  const [signInOtp, setSignInOtp] = useState([...EMPTY_OTP]);

  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regAgree, setRegAgree] = useState(false);
  const [regShowPassword, setRegShowPassword] = useState(false);
  const [regOtp, setRegOtp] = useState([...EMPTY_OTP]);

  const [otpRetryIn, setOtpRetryIn] = useState(0);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);
  const [signInFirebaseToken, setSignInFirebaseToken] = useState<string | null>(null);
  const [regFirebaseToken, setRegFirebaseToken] = useState<string | null>(null);

  const [isLoginSubmitting, setIsLoginSubmitting] = useState(false);
  const [isRegisterSubmitting, setIsRegisterSubmitting] = useState(false);
  const [otpShake, setOtpShake] = useState(false);

  const loginPhoneE164 = useMemo(() => formatTajikPhoneInput(loginPhone), [loginPhone]);
  const regPhoneE164 = useMemo(() => formatTajikPhoneInput(regPhone), [regPhone]);
  const signInOtpComplete = signInOtp.every((d) => d.trim().length === 1);
  const regOtpComplete = regOtp.every((d) => d.trim().length === 1);

  function mapApiErrorMessage(raw: string): string {
    const v = (raw || "").toLowerCase();
    if (v.includes("account not found")) return L.accountNotFound;
    if (v.includes("invalid credentials")) return L.errInvalidCredentials;
    if (v.includes("too many attempts")) return L.errTooManyAttempts;
    if (v.includes("phone already in use")) return L.errPhoneInUse;
    if (v.includes("email already in use")) return L.errEmailInUse;
    if (v.includes("invalid payload")) return L.errInvalidPayload;
    if (v.includes("invalid otp")) return L.errInvalidOtp;
    if (v.includes("please wait before requesting")) return L.errTooManyAttempts;
    return raw || L.errorGeneric;
  }

  function resetPhoneAuthState() {
    resetFirebasePhoneAuth();
    setSignInFirebaseToken(null);
    setRegFirebaseToken(null);
    setDevOtpHint(null);
  }

  async function requestOtp(phoneE164: string) {
    setOtpSending(true);
    setFormError(null);
    setFormSuccess(null);
    resetPhoneAuthState();
    try {
      if (useFirebaseSms) {
        await sendFirebasePhoneOtp(phoneE164);
      } else {
        const res = await fetch("/api/phone-otp/request", {
          method: "POST",
          headers: { "Content-Type": "application/json", accept: "application/json" },
          credentials: "include",
          body: JSON.stringify({ phone: phoneE164 })
        });
        const json = await readApiJson(res);
        if (!res.ok) throw new Error(json.error ?? `Ошибка сервера (${res.status})`);
        if (typeof json.otp === "string" && json.otp) setDevOtpHint(json.otp);
      }
      setOtpRetryIn(59);
      return true;
    } catch (err: unknown) {
      setFormError(mapApiErrorMessage(err instanceof Error ? err.message : ""));
      return false;
    } finally {
      setOtpSending(false);
    }
  }

  async function resolveFirebaseToken(code: string, current: string | null): Promise<string | null> {
    if (current) return current;
    if (!useFirebaseSms) return null;
    setOtpVerifying(true);
    try {
      const token = await confirmFirebasePhoneOtp(code);
      return token;
    } catch (err: unknown) {
      setFormError(mapApiErrorMessage(err instanceof Error ? err.message : L.errInvalidOtp));
      return null;
    } finally {
      setOtpVerifying(false);
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
    if (otpRetryIn <= 0) return;
    const timer = window.setTimeout(() => setOtpRetryIn((v) => Math.max(0, v - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [otpRetryIn]);

  useEffect(() => {
    if (!useFirebaseSms || registerPhoneStep !== "otp" || !regOtpComplete) return;
    void (async () => {
      const token = await resolveFirebaseToken(regOtp.join(""), regFirebaseToken);
      if (token) {
        setRegFirebaseToken(token);
        setFormSuccess(L.otpVerified);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regOtp, registerPhoneStep, useFirebaseSms]);

  async function handleGoogleSignIn() {
    if (!googleOAuthEnabled) return;
    const n = safeReturnPath(nextPath);
    const callbackUrl =
      n && !n.startsWith("/dashboard/admin") && !n.startsWith("/dashboard/owner") ? n : "/dashboard/guest";
    await signIn("google", { callbackUrl });
  }

  async function handleSignInEmail(e: React.FormEvent) {
    e.preventDefault();
    if (isLoginSubmitting) return;
    setFormError(null);
    setIsLoginSubmitting(true);
    try {
      const trimmed = loginId.trim();
      if (!trimmed || !loginPassword) {
        setFormError(L.fieldRequired);
        return;
      }
      const resetLink = parseResetPasswordLink(loginPassword);
      if (resetLink) {
        setFormError(L.resetLinkInPassword);
        window.location.href = resetLink;
        return;
      }
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

  async function handleSignInPhoneSendCode() {
    if (!loginPhoneE164) {
      setFormError(L.errInvalidPayload);
      return;
    }
    const ok = await requestOtp(loginPhoneE164);
    if (ok) {
      setSignInOtp([...EMPTY_OTP]);
      setSignInPhoneStep("otp");
    }
  }

  async function handleSignInPhoneSubmit() {
    if (!signInOtpComplete || isLoginSubmitting) return;
    setIsLoginSubmitting(true);
    setFormError(null);
    try {
      const code = signInOtp.join("");
      if (useFirebaseSms) {
        const idToken = await resolveFirebaseToken(code, signInFirebaseToken);
        if (!idToken) return;
        setSignInFirebaseToken(idToken);
        await postJson("/api/auth/firebase/session", { idToken });
      } else {
        await postJson("/api/phone-otp/verify", { phone: loginPhoneE164, code });
      }
      await refreshMe();
    } catch (err: unknown) {
      setOtpShake(true);
      setFormError(mapApiErrorMessage(err instanceof Error ? err.message : ""));
      window.setTimeout(() => setOtpShake(false), 500);
    } finally {
      setIsLoginSubmitting(false);
    }
  }

  async function handleRegisterPhoneSendCode() {
    if (!regName.trim()) {
      setFormError(L.fieldRequired);
      return;
    }
    if (!regPhoneE164) {
      setFormError(L.errInvalidPayload);
      return;
    }
    if (!regAgree) {
      setFormError(L.errTermsRequired);
      return;
    }
    const ok = await requestOtp(regPhoneE164);
    if (ok) {
      setRegOtp([...EMPTY_OTP]);
      setRegisterPhoneStep("otp");
    }
  }

  async function handleRegisterPhoneSubmit() {
    if (!regOtpComplete || isRegisterSubmitting) return;
    if (!regAgree) {
      setFormError(L.errTermsRequired);
      return;
    }
    setIsRegisterSubmitting(true);
    setFormError(null);
    try {
      const code = regOtp.join("");
      let idToken = regFirebaseToken;
      if (useFirebaseSms) {
        idToken = await resolveFirebaseToken(code, idToken);
        if (!idToken) return;
        setRegFirebaseToken(idToken);
      }
      await postJson("/api/auth/firebase/register", {
        name: regName.trim(),
        phone: regPhoneE164,
        email: regEmail.trim() ? regEmail.trim().toLowerCase() : undefined,
        ...(useFirebaseSms && idToken ? { firebaseIdToken: idToken } : { otp: code })
      });
      await refreshMe();
    } catch (err: unknown) {
      setOtpShake(true);
      setFormError(mapApiErrorMessage(err instanceof Error ? err.message : ""));
      window.setTimeout(() => setOtpShake(false), 500);
    } finally {
      setIsRegisterSubmitting(false);
    }
  }

  async function handleRegisterEmail(e: React.FormEvent) {
    e.preventDefault();
    if (isRegisterSubmitting) return;
    setFormError(null);
    if (!regName.trim() || !regEmail.trim() || !regPassword) {
      setFormError(L.fieldRequired);
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setFormError(L.errPasswordMismatch);
      return;
    }
    if (!regAgree) {
      setFormError(L.errTermsRequired);
      return;
    }
    setIsRegisterSubmitting(true);
    try {
      await postJson("/api/auth/email/register-email", {
        name: regName.trim(),
        email: regEmail.trim().toLowerCase(),
        password: regPassword
      });
      await refreshMe();
    } catch (err: unknown) {
      setFormError(mapApiErrorMessage(err instanceof Error ? err.message : ""));
    } finally {
      setIsRegisterSubmitting(false);
    }
  }

  function GoogleButton() {
    if (!googleOAuthEnabled) return null;
    return (
      <>
        <div className="flex items-center gap-3 py-1 text-xs text-brand-300">
          <span className="h-px flex-1 bg-brand-700" />
          <span>{L.orContinueWith}</span>
          <span className="h-px flex-1 bg-brand-700" />
        </div>
        <button
          type="button"
          onClick={() => handleGoogleSignIn().catch(() => setFormError(L.googleSignInError))}
          className="h-12 w-full rounded-2xl border border-brand-700 bg-brand-800 px-4 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          {L.googleSignIn}
        </button>
      </>
    );
  }

  const subtitle = mainTab === "signIn" ? L.signInSubtitle : L.registerSubtitle;

  return (
    <div className="mx-auto flex w-[94%] max-w-6xl justify-center px-0 py-6 sm:w-full sm:px-6 sm:py-10 lg:px-8">
      <div id="firebase-recaptcha" className="sr-only" aria-hidden />
      <div className="grid gap-5 sm:gap-8 lg:grid-cols-2 lg:items-stretch">
        <section className="surface-1 relative overflow-hidden rounded-3xl p-5 sm:rounded-[28px] sm:p-8 lg:p-10" data-reveal data-stagger="20">
          <Link href="/" className="inline-flex min-w-0 items-center gap-3 rounded-2xl outline-none transition hover:opacity-90">
            <Image src="/logo-mark.svg" alt="TajStay" width={56} height={56} className="h-12 w-12 rounded-2xl sm:h-14 sm:w-14" unoptimized priority />
            <div className="min-w-0">
              <div className="truncate text-lg font-semibold tracking-tight text-white sm:text-xl">TajStay</div>
              <div className="text-sm text-brand-200">{L.title}</div>
            </div>
          </Link>
          <h1 className="mt-6 text-[clamp(1.6rem,7vw,2.25rem)] font-extrabold leading-tight tracking-tight text-white sm:mt-8">{L.leftTitle}</h1>
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
                <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-700 text-white ring-1 ring-brand-600">✓</span>
                <span className="leading-snug">{b}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="auth-form-panel surface-1 rounded-3xl p-4 sm:rounded-[28px] sm:p-8" data-reveal data-stagger="80">
          <div>
            <div className="text-sm font-semibold text-white">{L.heading}</div>
            <div className="mt-1 text-xs text-brand-200">{subtitle}</div>
          </div>

          <div className="mt-5 rounded-2xl bg-brand-900 p-1">
            <div className="grid grid-cols-2">
              {(["signIn", "register"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setMainTab(t);
                    setFormError(null);
                    setFormSuccess(null);
                    resetPhoneAuthState();
                  }}
                  className={`rounded-[14px] px-2 py-2 text-xs font-semibold transition sm:px-4 sm:text-sm ${
                    mainTab === t ? "bg-brand-500 text-white shadow-sm" : "text-brand-200 hover:text-white"
                  }`}
                >
                  {t === "signIn" ? L.tabsSignIn : L.tabsRegister}
                </button>
              ))}
            </div>
          </div>

          {formError && (
            <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{formError}</div>
          )}
          {formSuccess && (
            <div className="mt-4 rounded-2xl border border-[var(--brand-green)]/30 bg-[rgba(34,197,94,0.1)] p-3 text-sm text-[var(--brand-green)]">
              {formSuccess}
            </div>
          )}

          {mainTab === "signIn" ? (
            <div className="mt-6 space-y-4">
              <AuthMethodTabs
                method={signInMethod}
                onChange={(m) => {
                  setSignInMethod(m);
                  setFormError(null);
                  setSignInPhoneStep("input");
                  resetPhoneAuthState();
                }}
                phoneLabel={L.methodPhone}
                emailLabel={L.methodEmail}
              />

              {signInMethod === "phone" ? (
                signInPhoneStep === "input" ? (
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-white">{L.phone}</label>
                      <TajikPhoneInput value={loginPhone} onChange={setLoginPhone} disabled={otpSending} />
                    </div>
                    <button
                      type="button"
                      disabled={otpSending || !loginPhoneE164}
                      onClick={() => void handleSignInPhoneSendCode()}
                      className="ds-primary-btn h-12 w-full disabled:opacity-60"
                    >
                      {otpSending ? `${L.getCode}…` : L.getCode}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <OtpVerificationPanel
                      phoneE164={loginPhoneE164}
                      title={L.stepCodeTitle}
                      sentToLabel={L.sentToLabel}
                      retryIn={otpRetryIn}
                      retryNowLabel={L.retryNow}
                      retryInLabel={L.retryIn}
                      devHint={!useFirebaseSms ? devOtpHint : null}
                      value={signInOtp}
                      onChange={setSignInOtp}
                      onComplete={() => void handleSignInPhoneSubmit()}
                      onResend={() => {
                        setSignInOtp([...EMPTY_OTP]);
                        void handleSignInPhoneSendCode();
                      }}
                      verifying={otpVerifying || isLoginSubmitting}
                      sending={otpSending}
                      error={!!formError}
                      success={!!signInFirebaseToken}
                      shake={otpShake}
                    />
                    <div className="auth-sticky-actions grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        className="min-h-[48px] rounded-xl border border-white/10 bg-white/5 py-2 text-sm text-white"
                        onClick={() => {
                          setSignInPhoneStep("input");
                          resetPhoneAuthState();
                          setSignInOtp([...EMPTY_OTP]);
                        }}
                      >
                        {L.back}
                      </button>
                      <button
                        type="button"
                        disabled={isLoginSubmitting || !signInOtpComplete || otpVerifying}
                        onClick={() => void handleSignInPhoneSubmit()}
                        className="brand-gradient min-h-[48px] rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                      >
                        {isLoginSubmitting ? `${L.signIn}…` : L.signIn}
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <form onSubmit={handleSignInEmail} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-white">{L.loginLabel}</label>
                    <input
                      value={loginId}
                      onChange={(e) => setLoginId(e.target.value)}
                      placeholder={L.emailPlaceholder}
                      className="h-12 w-full rounded-2xl border border-brand-700 bg-brand-900 px-4 text-sm text-white outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
                      autoComplete="username"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <label className="mb-1.5 block text-sm font-semibold text-white">{L.password}</label>
                      <button type="button" onClick={() => setLoginShowPassword((v) => !v)} className="text-xs font-semibold text-brand-200 hover:text-white">
                        {loginShowPassword ? L.hidePassword : L.showPassword}
                      </button>
                    </div>
                    <input
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      type={loginShowPassword ? "text" : "password"}
                      placeholder={L.passwordPlaceholder}
                      className="h-12 w-full rounded-2xl border border-brand-700 bg-brand-900 px-4 text-sm text-white outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
                      autoComplete="current-password"
                    />
                  </div>
                  <button type="submit" disabled={isLoginSubmitting} className="brand-gradient h-12 w-full rounded-2xl text-sm font-semibold text-white disabled:opacity-60">
                    {isLoginSubmitting ? `${L.signIn}…` : L.signIn}
                  </button>
                  <Link href="/auth/reset-password" className="block text-center text-sm font-semibold text-brand-200 hover:text-white">
                    {L.forgotPassword}
                  </Link>
                </form>
              )}

              <GoogleButton />
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <AuthMethodTabs
                method={registerMethod}
                onChange={(m) => {
                  setRegisterMethod(m);
                  setFormError(null);
                  setRegisterPhoneStep("input");
                  resetPhoneAuthState();
                }}
                phoneLabel={L.methodPhone}
                emailLabel={L.methodEmail}
              />

              {registerMethod === "phone" ? (
                registerPhoneStep === "input" ? (
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-white">{L.fullName}</label>
                      <input
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        className="h-12 w-full rounded-2xl border border-brand-700 bg-brand-900 px-4 text-sm text-white outline-none"
                        autoComplete="name"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-white">{L.phone}</label>
                      <TajikPhoneInput value={regPhone} onChange={setRegPhone} disabled={otpSending} />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-white">{L.email}</label>
                      <input
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        type="email"
                        placeholder={`${L.email} (${L.methodEmail})`}
                        className="h-12 w-full rounded-2xl border border-brand-700 bg-brand-900 px-4 text-sm text-white outline-none"
                      />
                    </div>
                    <TermsCheckbox checked={regAgree} onChange={setRegAgree} label={L.agreeTerms} />
                    <button
                      type="button"
                      disabled={otpSending}
                      onClick={() => void handleRegisterPhoneSendCode()}
                      className="ds-primary-btn h-12 w-full disabled:opacity-60"
                    >
                      {otpSending ? `${L.getCode}…` : L.getCode}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <OtpVerificationPanel
                      phoneE164={regPhoneE164}
                      title={L.enterCode}
                      sentToLabel={L.sentToLabel}
                      retryIn={otpRetryIn}
                      retryNowLabel={L.retryNow}
                      retryInLabel={L.retryIn}
                      devHint={!useFirebaseSms ? devOtpHint : null}
                      value={regOtp}
                      onChange={setRegOtp}
                      onComplete={() => void handleRegisterPhoneSubmit()}
                      onResend={() => {
                        setRegOtp([...EMPTY_OTP]);
                        void handleRegisterPhoneSendCode();
                      }}
                      verifying={otpVerifying || isRegisterSubmitting}
                      sending={otpSending}
                      error={!!formError}
                      success={!!regFirebaseToken}
                      shake={otpShake}
                    />
                    <div className="auth-sticky-actions grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        className="min-h-[48px] rounded-xl border border-white/10 bg-white/5 py-2 text-sm text-white"
                        onClick={() => {
                          setRegisterPhoneStep("input");
                          resetPhoneAuthState();
                          setRegOtp([...EMPTY_OTP]);
                        }}
                      >
                        {L.back}
                      </button>
                      <button
                        type="button"
                        disabled={isRegisterSubmitting || !regOtpComplete || otpVerifying || (useFirebaseSms && !regFirebaseToken)}
                        onClick={() => void handleRegisterPhoneSubmit()}
                        className="brand-gradient min-h-[48px] rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                      >
                        {isRegisterSubmitting ? `${L.createAccount}…` : L.createAccount}
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <form onSubmit={handleRegisterEmail} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-white">{L.fullName}</label>
                    <input
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className="h-12 w-full rounded-2xl border border-brand-700 bg-brand-900 px-4 text-sm text-white outline-none"
                      autoComplete="name"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-white">{L.email}</label>
                    <input
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      type="email"
                      className="h-12 w-full rounded-2xl border border-brand-700 bg-brand-900 px-4 text-sm text-white outline-none"
                      autoComplete="email"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-white">{L.password}</label>
                      <input
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        type={regShowPassword ? "text" : "password"}
                        placeholder={L.createPassword}
                        className="h-12 w-full rounded-2xl border border-brand-700 bg-brand-900 px-4 text-sm text-white outline-none"
                        minLength={6}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-white">{L.confirmPassword}</label>
                      <input
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        type={regShowPassword ? "text" : "password"}
                        placeholder={L.confirmPasswordPlaceholder}
                        className="h-12 w-full rounded-2xl border border-brand-700 bg-brand-900 px-4 text-sm text-white outline-none"
                        minLength={6}
                      />
                    </div>
                  </div>
                  <button type="button" onClick={() => setRegShowPassword((v) => !v)} className="text-xs font-semibold text-brand-200 hover:text-white">
                    {regShowPassword ? L.hidePassword : L.showPassword}
                  </button>
                  <TermsCheckbox checked={regAgree} onChange={setRegAgree} label={L.agreeTerms} />
                  <button type="submit" disabled={isRegisterSubmitting} className="brand-gradient h-12 w-full rounded-2xl text-sm font-semibold text-white disabled:opacity-60">
                    {isRegisterSubmitting ? `${L.createAccount}…` : L.createAccount}
                  </button>
                </form>
              )}

              <GoogleButton />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function TermsCheckbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-start gap-3 rounded-2xl border border-brand-700 bg-brand-900 px-4 py-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 rounded border-brand-600 text-brand-500"
      />
      <span className="text-sm font-medium text-brand-200">{label}</span>
    </label>
  );
}
