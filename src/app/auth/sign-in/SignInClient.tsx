"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import type { Locale } from "@/lib/i18n/locale";
import { postLoginRedirect, safeReturnPath } from "@/lib/auth/postLoginRedirect";
import { TelegramLoginPanel } from "@/components/auth/TelegramLoginPanel";

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
  signInSubtitle: string;
  registerSubtitle: string;
  loginLabel: string;
  emailPlaceholder: string;
  password: string;
  passwordPlaceholder: string;
  showPassword: string;
  hidePassword: string;
  signIn: string;
  fullName: string;
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
  googleRegister: string;
  googleSignInError: string;
  forgotPassword: string;
  errInvalidCredentials: string;
  errTooManyAttempts: string;
  errEmailInUse: string;
  errInvalidPayload: string;
  orUseEmail: string;
  telegramSignIn: string;
  telegramRegister: string;
  telegramRegisterHint: string;
  telegramOpenBot: string;
  telegramWaitingBot: string;
  telegramAwaitingConfirm: string;
  telegramConfirmed: string;
  telegramExpired: string;
  telegramStep1: string;
  telegramStep2: string;
  telegramExpiresIn: string;
  telegramConfigWarning: string;
};

async function readApiJson(res: Response): Promise<{ error?: string }> {
  const text = await res.text();
  if (!text.trim()) return { error: res.ok ? undefined : `Ошибка сервера (${res.status})` };
  try {
    return JSON.parse(text) as { error?: string };
  } catch {
    return { error: `Ошибка сервера (${res.status})` };
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
  telegramLoginEnabled?: boolean;
  telegramBotUsername?: string | null;
  showTelegramConfigWarning?: boolean;
};

type MainTab = "signIn" | "register";

export function SignInClient({
  locale,
  labels: L,
  nextPath = null,
  googleOAuthEnabled = false,
  telegramLoginEnabled = false,
  telegramBotUsername = null,
  showTelegramConfigWarning = false
}: Props) {
  const [me, setMe] = useState<ApiUser | null>(null);
  const [mainTab, setMainTab] = useState<MainTab>("signIn");
  const [formError, setFormError] = useState<string | null>(null);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginShowPassword, setLoginShowPassword] = useState(false);

  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regAgree, setRegAgree] = useState(false);
  const [regShowPassword, setRegShowPassword] = useState(false);

  const [isLoginSubmitting, setIsLoginSubmitting] = useState(false);
  const [isRegisterSubmitting, setIsRegisterSubmitting] = useState(false);

  const isRegister = mainTab === "register";

  function mapApiErrorMessage(raw: string): string {
    const v = (raw || "").toLowerCase();
    if (v.includes("invalid credentials")) return L.errInvalidCredentials;
    if (v.includes("too many attempts")) return L.errTooManyAttempts;
    if (v.includes("email already in use")) return L.errEmailInUse;
    if (v.includes("invalid payload")) return L.errInvalidPayload;
    if (v.includes("billing-not-enabled") || v.includes("firebase")) return L.errorGeneric;
    return raw || L.errorGeneric;
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

  async function handleGoogleAuth() {
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
      const email = loginEmail.trim().toLowerCase();
      if (!email || !loginPassword) {
        setFormError(L.fieldRequired);
        return;
      }
      const resetLink = parseResetPasswordLink(loginPassword);
      if (resetLink) {
        setFormError(L.resetLinkInPassword);
        window.location.href = resetLink;
        return;
      }
      await postJson("/api/auth/email/login", { email, password: loginPassword });
      await refreshMe();
    } catch (err: unknown) {
      setFormError(mapApiErrorMessage(err instanceof Error ? err.message : ""));
    } finally {
      setIsLoginSubmitting(false);
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

  function PrimarySocialAuth() {
    return (
      <div className="space-y-3">
        {showTelegramConfigWarning ? (
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
            {L.telegramConfigWarning}
            {telegramBotUsername ? ` (@${telegramBotUsername.replace(/^@/, "")})` : ""}
          </p>
        ) : null}

        {telegramLoginEnabled ? (
          <>
            {isRegister ? (
              <p className="text-center text-xs text-brand-300">{L.telegramRegisterHint}</p>
            ) : null}
            <TelegramLoginPanel
              locale={locale}
              labels={{
                signIn: isRegister ? L.telegramRegister : L.telegramSignIn,
                openBot: L.telegramOpenBot,
                waitingBot: L.telegramWaitingBot,
                awaitingConfirm: L.telegramAwaitingConfirm,
                confirmed: L.telegramConfirmed,
                expired: L.telegramExpired,
                errorGeneric: L.errorGeneric,
                expiresIn: L.telegramExpiresIn,
                step1: L.telegramStep1,
                step2: L.telegramStep2
              }}
              onSuccess={() => refreshMe()}
              onError={(msg) => setFormError(mapApiErrorMessage(msg))}
            />
          </>
        ) : null}

        {googleOAuthEnabled ? (
          <button
            type="button"
            onClick={() => handleGoogleAuth().catch(() => setFormError(L.googleSignInError))}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-brand-700 bg-brand-800 px-4 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            <GoogleIcon />
            {isRegister ? L.googleRegister : L.googleSignIn}
          </button>
        ) : null}
      </div>
    );
  }

  const subtitle = isRegister ? L.registerSubtitle : L.signInSubtitle;

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

          {formError ? (
            <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{formError}</div>
          ) : null}

          <div className="mt-6 space-y-5">
            <PrimarySocialAuth />

            <div className="flex items-center gap-3 text-xs text-brand-300">
              <span className="h-px flex-1 bg-brand-700" />
              <span>{L.orUseEmail}</span>
              <span className="h-px flex-1 bg-brand-700" />
            </div>

            {isRegister ? (
              <form onSubmit={handleRegisterEmail} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-white">{L.fullName}</label>
                  <input
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="h-12 w-full rounded-2xl border border-brand-700 bg-brand-900 px-4 text-sm text-white outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
                    autoComplete="name"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-white">{L.email}</label>
                  <input
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    type="email"
                    className="h-12 w-full rounded-2xl border border-brand-700 bg-brand-900 px-4 text-sm text-white outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
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
                      placeholder={L.passwordPlaceholder}
                      className="h-12 w-full rounded-2xl border border-brand-700 bg-brand-900 px-4 text-sm text-white outline-none"
                      minLength={6}
                      autoComplete="new-password"
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
                      autoComplete="new-password"
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
            ) : (
              <form onSubmit={handleSignInEmail} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-white">{L.email}</label>
                  <input
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    type="email"
                    placeholder={L.emailPlaceholder}
                    className="h-12 w-full rounded-2xl border border-brand-700 bg-brand-900 px-4 text-sm text-white outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
                    autoComplete="email"
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
          </div>
        </section>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
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
