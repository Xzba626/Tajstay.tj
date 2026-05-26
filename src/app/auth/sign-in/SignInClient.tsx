"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { signIn } from "next-auth/react";
import type { Locale } from "@/lib/i18n/locale";
import { postLoginRedirect, safeReturnPath } from "@/lib/auth/postLoginRedirect";
import { AuthPromoPanel, type AuthPromoLabels } from "@/components/auth/AuthPromoPanel";
import { AuthSocialButtons } from "@/components/auth/AuthSocialButtons";
import { AuthTrustStrip } from "@/components/auth/AuthTrustStrip";
import { BrandMark } from "@/components/brand/BrandMark";

type ApiUser = { id: number; role: string; name: string; phone: string; email?: string | null };

export type SignInLabels = {
  tabsSignIn: string;
  tabsRegister: string;
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
  telegramOpenBot: string;
  telegramWaitingBot: string;
  telegramAwaitingPhone: string;
  telegramEnterCode: string;
  telegramCodeSentHint: string;
  telegramExpired: string;
  telegramStep1: string;
  telegramStep2: string;
  telegramStep3: string;
  telegramVerify: string;
  telegramTooManyAttempts: string;
  telegramConfigWarning: string;
  telegramExpiresIn: string;
  badgeFast: string;
  back: string;
  welcomeTitleLogin: string;
  welcomeTitleRegister: string;
  welcomeSubtitleLogin: string;
  welcomeSubtitleRegister: string;
  rememberMe: string;
  trustBooking: string;
  trustData: string;
  trustSupport: string;
  footerCopyright: string;
  footerPrivacy: string;
  footerTerms: string;
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
  promoLabels,
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
  const [rememberMe, setRememberMe] = useState(false);

  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regAgree, setRegAgree] = useState(false);
  const [regShowPassword, setRegShowPassword] = useState(false);

  const [isLoginSubmitting, setIsLoginSubmitting] = useState(false);
  const [isRegisterSubmitting, setIsRegisterSubmitting] = useState(false);

  const loginEmailId = useId();
  const loginPasswordId = useId();
  const regNameId = useId();
  const regEmailId = useId();
  const regPasswordId = useId();
  const regConfirmId = useId();

  const isRegister = mainTab === "register";
  const cardTitle = isRegister ? L.welcomeTitleRegister : L.welcomeTitleLogin;
  const cardSubtitle = isRegister ? L.welcomeSubtitleRegister : L.welcomeSubtitleLogin;

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

  return (
    <div className="auth-premium-page">
      <div className="auth-premium-aurora" aria-hidden />
      <div className="auth-premium-stars" aria-hidden />

      <div className="auth-premium-shell">
        <AuthPromoPanel labels={promoLabels} />

        <div className="auth-premium-main">
          <div className="auth-premium-mobile-head lg:hidden">
            <BrandMark href="/" nameClassName="text-base text-white" className="mx-auto justify-center" />
            <p className="mt-3 text-sm text-[var(--auth-text-secondary)]">{promoLabels.subtitle}</p>
            <div className="auth-premium-mobile-chips" role="list">
              {[L.mobileChip1, L.mobileChip2, L.mobileChip3].map((chip) => (
                <span key={chip} className="auth-premium-chip" role="listitem">
                  {chip}
                </span>
              ))}
            </div>
          </div>

          <article className="auth-premium-card">
            <div className="auth-premium-card__icon" aria-hidden>
              <UserCircleIcon />
            </div>
            <h2 className="auth-premium-card__title">{cardTitle}</h2>
            <p className="auth-premium-card__subtitle">{cardSubtitle}</p>

            <div className="auth-premium-tabs" role="tablist" aria-label={cardTitle}>
              {(["signIn", "register"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={mainTab === t}
                  className="auth-premium-tab"
                  onClick={() => {
                    setMainTab(t);
                    setFormError(null);
                  }}
                >
                  {t === "signIn" ? L.tabsSignIn : L.tabsRegister}
                </button>
              ))}
            </div>

            {formError ? (
              <div className="auth-premium-error" role="alert">
                {formError}
              </div>
            ) : null}

            <div className="mt-6">
              {isRegister ? (
                <form onSubmit={handleRegisterEmail} className="space-y-4" noValidate>
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
                  <label className="auth-premium-terms">
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
                    className="auth-premium-submit"
                    disabled={isRegisterSubmitting}
                    aria-busy={isRegisterSubmitting}
                  >
                    {L.createAccount}
                    <ArrowIcon />
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSignInEmail} className="space-y-4" noValidate>
                  <AuthField
                    id={loginEmailId}
                    label={L.loginLabel}
                    type="text"
                    value={loginEmail}
                    onChange={setLoginEmail}
                    autoComplete="username"
                    placeholder={L.emailPlaceholder}
                    icon={<UserIcon />}
                    invalid={!!formError && !loginEmail.trim()}
                  />
                  <AuthField
                    id={loginPasswordId}
                    label={L.password}
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
                  <div className="auth-premium-row">
                    <label className="auth-premium-check">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                      />
                      {L.rememberMe}
                    </label>
                    <Link href="/auth/reset-password" className="auth-premium-link">
                      {L.forgotPassword}
                    </Link>
                  </div>
                  <button
                    type="submit"
                    className="auth-premium-submit"
                    disabled={isLoginSubmitting}
                    aria-busy={isLoginSubmitting}
                  >
                    {L.signInCta}
                    <ArrowIcon />
                  </button>
                </form>
              )}

              <div className="auth-premium-divider">{L.orContinueSocial}</div>

              <AuthSocialButtons
                locale={locale}
                isRegister={isRegister}
                googleOAuthEnabled={googleOAuthEnabled}
                telegramLoginEnabled={telegramLoginEnabled}
                showTelegramConfigWarning={showTelegramConfigWarning}
                telegramBotUsername={telegramBotUsername}
                labels={{
                  googleContinue: L.googleContinue,
                  googleRegister: L.googleRegister,
                  googleSignInError: L.googleSignInError,
                  telegramContinue: L.telegramContinue,
                  telegramRegister: L.telegramRegister,
                  telegramRegisterHint: L.telegramRegisterHint,
                  badgeFast: "",
                  telegramConfigWarning: L.telegramConfigWarning,
                  telegram: {
                    signIn: L.telegramContinue,
                    openBot: L.telegramOpenBot,
                    waitingBot: L.telegramWaitingBot,
                    awaitingPhone: L.telegramAwaitingPhone,
                    enterCode: L.telegramEnterCode,
                    codeSentHint: L.telegramCodeSentHint,
                    expired: L.telegramExpired,
                    errorGeneric: L.errorGeneric,
                    expiresIn: "",
                    step1: L.telegramStep1,
                    step2: L.telegramStep2,
                    step3: L.telegramStep3,
                    verify: L.telegramVerify,
                    tooManyAttempts: L.telegramTooManyAttempts,
                    back: L.back
                  }
                }}
                onGoogle={() => handleGoogleAuth().catch(() => setFormError(L.googleSignInError))}
                onTelegramSuccess={() => refreshMe()}
                onError={(msg) => setFormError(mapApiErrorMessage(msg))}
              />
            </div>

            <AuthTrustStrip
              items={[
                { id: "1", label: L.trustBooking },
                { id: "2", label: L.trustData },
                { id: "3", label: L.trustSupport }
              ]}
            />
          </article>

          <footer className="auth-premium-page-footer">
            <span>{L.footerCopyright}</span>
            <Link href="/policy">{L.footerPrivacy}</Link>
            <Link href="/terms">{L.footerTerms}</Link>
          </footer>
        </div>
      </div>
    </div>
  );
}

function AuthField({
  id,
  label,
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
    <div className="auth-premium-field">
      <label htmlFor={id} className="auth-premium-label">
        {label}
      </label>
      <div className="auth-premium-input-wrap">
        <span className="auth-premium-input-icon" aria-hidden>
          {icon}
        </span>
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={invalid || undefined}
          aria-describedby={helperId}
          className="auth-premium-input"
          style={toggle ? { paddingRight: "3rem" } : undefined}
        />
        {toggle ? (
          <button
            type="button"
            className="auth-premium-input-toggle"
            onClick={toggle.onToggle}
            aria-label={toggle.show ? toggle.hideLabel : toggle.showLabel}
          >
            {toggle.show ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        ) : null}
      </div>
      <p id={helperId} className="auth-premium-helper" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)" }}>
        {label}
      </p>
    </div>
  );
}

function UserCircleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="12" cy="8" r="4" />
      <path d="M5 20c1.5-3 4.5-5 7-5s5.5 2 7 5" />
    </svg>
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
