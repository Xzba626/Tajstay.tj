"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { signIn } from "next-auth/react";
import type { Locale } from "@/lib/i18n/locale";
import { postLoginRedirect, safeReturnPath } from "@/lib/auth/postLoginRedirect";
import { AuthPromoPanel, type AuthPromoLabels } from "@/components/auth/AuthPromoPanel";
import type { AuthPromoFeaturedHotel } from "@/lib/services/authPromoHotel";
import { AuthSocialButtons } from "@/components/auth/AuthSocialButtons";
import { TelegramLoginPanel } from "@/components/auth/TelegramLoginPanel";

type ApiUser = { id: number; role: string; name: string; phone: string; email?: string | null };

export type SignInLabels = {
  cardTitleLogin: string;
  cardSubtitleLogin: string;
  loginLabel: string;
  emailPlaceholder: string;
  password: string;
  passwordPlaceholder: string;
  showPassword: string;
  hidePassword: string;
  signInCta: string;
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
  resetLinkInPassword: string;
  googleContinue: string;
  googleRegister: string;
  googleSignInError: string;
  forgotPassword: string;
  errInvalidCredentials: string;
  errTooManyAttempts: string;
  errEmailInUse: string;
  errInvalidPayload: string;
  orContinueSocial: string;
  telegramContinue: string;
  telegramRegister: string;
  telegramRegisterHint: string;
  telegramFlowTitle: string;
  telegramFlowSubtitle: string;
  telegramStepsCompact: string;
  telegramHelpHow: string;
  telegramBrowserFallback: string;
  telegramCantOpenHelp: string;
  telegramManualHelp: string;
  telegramBackToSignIn: string;
  telegramAwaitingPhone: string;
  telegramEnterCode: string;
  telegramCodePlaceholder: string;
  telegramVerifying: string;
  telegramCodeSuccess: string;
  telegramCodeInvalid: string;
  telegramCodeExpired: string;
  telegramVerify: string;
  telegramTooManyAttempts: string;
  telegramConfigWarning: string;
  telegramUnavailable: string;
  telegramExpiresIn: string;
  otpExpired: string;
  otpRequestNew: string;
  telegramResendOpen: string;
  badgeFast: string;
  welcomeTitleLogin: string;
  welcomeTitleRegister: string;
  welcomeSubtitleLogin: string;
  welcomeSubtitleRegister: string;
  rememberMe: string;
  noAccount: string;
  switchToRegister: string;
  hasAccount: string;
  switchToSignIn: string;
  footerCopyright: string;
  footerPrivacy: string;
  footerTerms: string;
  mobileAuthBadge: string;
  mobileChip1: string;
  mobileChip2: string;
  mobileChip3: string;
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
  promoLabels: AuthPromoLabels;
  brandMarkUrl: string;
  brandName: string;
  featuredHotel?: AuthPromoFeaturedHotel | null;
  initialMode?: "signIn" | "register";
  nextPath?: string | null;
  googleOAuthEnabled?: boolean;
  telegramLoginEnabled?: boolean;
  telegramUnavailable?: boolean;
};

type MainTab = "signIn" | "register";

export function SignInClient({
  locale,
  labels: L,
  promoLabels,
  brandMarkUrl,
  brandName,
  featuredHotel = null,
  initialMode = "signIn",
  nextPath = null,
  googleOAuthEnabled = false,
  telegramLoginEnabled = false,
  telegramUnavailable = false
}: Props) {
  const [me, setMe] = useState<ApiUser | null>(null);
  const [mode, setMode] = useState<MainTab>(initialMode === "register" ? "register" : "signIn");
  const [formError, setFormError] = useState<string | null>(null);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginShowPassword, setLoginShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regAgree, setRegAgree] = useState(false);
  const [regShowPassword, setRegShowPassword] = useState(false);

  const [isLoginSubmitting, setIsLoginSubmitting] = useState(false);
  const [isRegisterSubmitting, setIsRegisterSubmitting] = useState(false);
  const [telegramFlowActive, setTelegramFlowActive] = useState(false);

  const loginEmailId = useId();
  const loginPasswordId = useId();
  const regNameId = useId();
  const regEmailId = useId();
  const regPasswordId = useId();
  const regConfirmId = useId();

  const isRegister = mode === "register";
  const welcomeTitle = isRegister ? L.welcomeTitleRegister : L.welcomeTitleLogin;
  const welcomeSubtitle = isRegister ? L.welcomeSubtitleRegister : L.welcomeSubtitleLogin;

  function switchMode(next: MainTab) {
    setMode(next);
    setFormError(null);
    setTelegramFlowActive(false);
  }

  function mapApiErrorMessage(raw: string): string {
    const v = (raw || "").toLowerCase();
    if (v.includes("invalid credentials")) return L.errInvalidCredentials;
    if (v.includes("too many attempts")) return L.errTooManyAttempts;
    if (v.includes("email already in use")) return L.errEmailInUse;
    if (v.includes("invalid payload")) return L.errInvalidPayload;
    return raw || L.errorGeneric;
  }

  async function refreshMe() {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    const json = await res.json().catch(() => ({}));
    setMe(json.user ?? null);
  }

  useEffect(() => {
    refreshMe().catch(() => undefined);
    try {
      const saved = localStorage.getItem("tajstay_remember_login");
      if (saved) {
        setLoginEmail(saved);
        setRememberMe(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!me) return;
    window.location.href = postLoginRedirect(me.role, nextPath);
  }, [me, nextPath]);

  async function handleGoogleAuth() {
    if (!googleOAuthEnabled) return;
    const n = safeReturnPath(nextPath);
    const callbackUrl =
      n && !n.startsWith("/dashboard/admin") && !n.startsWith("/dashboard/owner") ? n : "/dashboard/bookings";
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
      try {
        if (rememberMe) localStorage.setItem("tajstay_remember_login", email);
        else localStorage.removeItem("tajstay_remember_login");
      } catch {
        /* ignore */
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

  const telegramLabels = {
    signIn: L.telegramContinue,
    title: L.telegramFlowTitle,
    browserFallback: L.telegramBrowserFallback,
    codeExpired: L.telegramCodeExpired,
    otpExpired: L.otpExpired,
    expiresIn: L.telegramExpiresIn,
    requestNew: L.otpRequestNew,
    backToSignIn: L.telegramBackToSignIn,
    verifying: L.telegramVerifying,
    codeSuccess: L.telegramCodeSuccess,
    codeInvalid: L.telegramCodeInvalid,
    tooManyAttempts: L.telegramTooManyAttempts,
    errorGeneric: L.errorGeneric,
    unavailable: L.telegramUnavailable
  };

  return (
    <main className="taj-auth-page">
      <section className="taj-auth-shell">
        <AuthPromoPanel labels={promoLabels} featuredHotel={featuredHotel} />

        <section className="taj-auth-card">
          {telegramFlowActive && telegramLoginEnabled ? (
            <TelegramLoginPanel
              expanded
              onExpandedChange={setTelegramFlowActive}
              labels={telegramLabels}
              onSuccess={() => refreshMe()}
              onError={(msg) => setFormError(mapApiErrorMessage(msg))}
            />
          ) : (
            <div className="taj-auth-inner">
              <div className="taj-auth-welcome">
                <div className="taj-auth-logo">
                  <Image
                    src={brandMarkUrl}
                    alt=""
                    width={44}
                    height={44}
                    className="h-11 w-11 object-contain"
                    unoptimized
                    priority
                  />
                  <span className="sr-only">{brandName}</span>
                </div>
                <h1>{welcomeTitle}</h1>
                <p>{welcomeSubtitle}</p>
              </div>

              {formError ? (
                <div className="taj-form-error" role="alert">
                  {formError}
                </div>
              ) : null}

              <div className="taj-form">
              {isRegister ? (
                <form onSubmit={handleRegisterEmail} className="taj-form-stack" noValidate>
                  <AuthField
                    id={regNameId}
                    label={L.fullName}
                    value={regName}
                    onChange={setRegName}
                    autoComplete="name"
                    icon={<UserIcon />}
                    invalid={!!formError && !regName.trim()}
                  />
                  <AuthField
                    id={regEmailId}
                    label={L.email}
                    type="email"
                    value={regEmail}
                    onChange={setRegEmail}
                    autoComplete="email"
                    icon={<MailIcon />}
                    invalid={!!formError && !regEmail.trim()}
                  />
                  <AuthField
                    id={regPasswordId}
                    label={L.password}
                    type={regShowPassword ? "text" : "password"}
                    value={regPassword}
                    onChange={setRegPassword}
                    autoComplete="new-password"
                    placeholder={L.passwordPlaceholder}
                    icon={<LockIcon />}
                    toggle={{
                      show: regShowPassword,
                      onToggle: () => setRegShowPassword((v) => !v),
                      showLabel: L.showPassword,
                      hideLabel: L.hidePassword
                    }}
                    invalid={!!formError && !regPassword}
                  />
                  <AuthField
                    id={regConfirmId}
                    label={L.confirmPassword}
                    type={regShowPassword ? "text" : "password"}
                    value={regConfirmPassword}
                    onChange={setRegConfirmPassword}
                    autoComplete="new-password"
                    placeholder={L.confirmPasswordPlaceholder}
                    icon={<LockIcon />}
                    invalid={!!formError && regPassword !== regConfirmPassword}
                  />
                  <label className="taj-check-row taj-check-row--terms">
                    <input
                      type="checkbox"
                      checked={regAgree}
                      onChange={(e) => setRegAgree(e.target.checked)}
                      aria-invalid={!!formError && !regAgree}
                    />
                    <span>{L.agreeTerms}</span>
                  </label>
                  <button
                    type="submit"
                    className="taj-primary-button"
                    disabled={isRegisterSubmitting}
                    aria-busy={isRegisterSubmitting}
                  >
                    <span>{L.createAccount}</span>
                    <ArrowIcon />
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSignInEmail} className="taj-form-stack" noValidate>
                  <AuthField
                    id={loginEmailId}
                    label={L.loginLabel}
                    type="text"
                    value={loginEmail}
                    onChange={setLoginEmail}
                    autoComplete="username"
                    placeholder={L.emailPlaceholder}
                    icon={<MailIcon />}
                    invalid={!!formError && !loginEmail.trim()}
                  />
                  <AuthField
                    id={loginPasswordId}
                    label={L.password}
                    labelExtra={
                      <Link href="/auth/forgot-password" className="taj-link-button">
                        {L.forgotPassword}
                      </Link>
                    }
                    type={loginShowPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={setLoginPassword}
                    autoComplete="current-password"
                    placeholder={L.passwordPlaceholder}
                    icon={<LockIcon />}
                    toggle={{
                      show: loginShowPassword,
                      onToggle: () => setLoginShowPassword((v) => !v),
                      showLabel: L.showPassword,
                      hideLabel: L.hidePassword
                    }}
                    invalid={!!formError && !loginPassword}
                  />
                  <label className="taj-check-row">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    {L.rememberMe}
                  </label>
                  <button
                    type="submit"
                    className="taj-primary-button"
                    disabled={isLoginSubmitting}
                    aria-busy={isLoginSubmitting}
                  >
                    <span>{isLoginSubmitting ? "..." : L.signInCta}</span>
                    <ArrowIcon />
                  </button>
                </form>
              )}

              <div className="taj-divider">
                <span />
                <p>{L.orContinueSocial}</p>
                <span />
              </div>

              <AuthSocialButtons
                locale={locale}
                isRegister={isRegister}
                googleOAuthEnabled={googleOAuthEnabled}
                telegramLoginEnabled={telegramLoginEnabled}
                telegramUnavailable={telegramUnavailable}
                telegramFlowActive={telegramFlowActive}
                onTelegramFlowChange={setTelegramFlowActive}
                labels={{
                  googleContinue: L.googleContinue,
                  googleRegister: L.googleRegister,
                  googleSignInError: L.googleSignInError,
                  telegramContinue: L.telegramContinue,
                  telegramRegister: L.telegramRegister,
                  telegramRegisterHint: L.telegramRegisterHint,
                  telegramConfigWarning: L.telegramConfigWarning,
                  telegramUnavailable: L.telegramUnavailable,
                  telegram: telegramLabels
                }}
                onGoogle={() => handleGoogleAuth().catch(() => setFormError(L.googleSignInError))}
                onTelegramSuccess={() => refreshMe()}
                onError={(msg) => setFormError(mapApiErrorMessage(msg))}
              />

              <p className="taj-bottom-text">
                {isRegister ? (
                  <>
                    {L.hasAccount}{" "}
                    <button type="button" onClick={() => switchMode("signIn")}>
                      {L.switchToSignIn}
                    </button>
                  </>
                ) : (
                  <>
                    {L.noAccount}{" "}
                    <button type="button" onClick={() => switchMode("register")}>
                      {L.switchToRegister}
                    </button>
                  </>
                )}
              </p>
              </div>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function AuthField({
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
  invalid
}: {
  id: string;
  label: string;
  labelExtra?: React.ReactNode;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  icon: React.ReactNode;
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

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c2-3.5 5-5.5 8-5.5s6 2 8 5.5" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function LockIcon() {
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

function ArrowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}
