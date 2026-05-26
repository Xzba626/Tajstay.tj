import { isGoogleOAuthConfigured } from "@/lib/auth/googleOAuthEnv";
import {
  getTelegramBotUsername,
  isTelegramLoginConfigured,
  isTelegramLoginUiEnabled
} from "@/lib/telegram/config";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { SignInClient } from "./SignInClient";

export default function SignInPage({ searchParams }: { searchParams?: { next?: string } }) {
  const locale = getLocale();
  const telegramLoginEnabled = isTelegramLoginUiEnabled();
  const telegramApiReady = isTelegramLoginConfigured();
  const telegramBotUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.trim() || getTelegramBotUsername();
  const showTelegramConfigWarning =
    telegramLoginEnabled &&
    (!telegramApiReady || !process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.trim());

  const promoLabels = {
    badge: m(locale, "auth.promoBadge"),
    title: m(locale, "auth.promoTitle"),
    subtitle: m(locale, "auth.promoSubtitle"),
    stat1: m(locale, "auth.promoStat1"),
    stat2: m(locale, "auth.promoStat2"),
    stat3: m(locale, "auth.promoStat3"),
    previewHotel: m(locale, "auth.previewHotel"),
    previewCity: m(locale, "auth.previewCity"),
    previewRating: m(locale, "auth.previewRating"),
    previewDates: m(locale, "auth.previewDates"),
    previewPrice: m(locale, "auth.previewPrice"),
    previewCta: m(locale, "auth.previewCta"),
    trustSsl: m(locale, "auth.trustSsl"),
    trustVerified: m(locale, "auth.trustVerified"),
    trustNoFees: m(locale, "auth.trustNoFees"),
    trustInstant: m(locale, "auth.trustInstant"),
    footerCopyright: m(locale, "auth.footerCopyright"),
    footerPrivacy: m(locale, "auth.footerPrivacy"),
    footerTerms: m(locale, "auth.footerTerms")
  };

  const labels = {
    tabsSignIn: m(locale, "auth.tabsSignIn"),
    tabsRegister: m(locale, "auth.tabsRegister"),
    loginLabel: m(locale, "auth.loginLabel"),
    emailPlaceholder: m(locale, "auth.emailPlaceholder"),
    password: m(locale, "auth.password"),
    passwordPlaceholder: m(locale, "auth.passwordPlaceholder"),
    showPassword: m(locale, "auth.showPassword"),
    hidePassword: m(locale, "auth.hidePassword"),
    signInCta: m(locale, "auth.signInCta"),
    fullName: m(locale, "auth.fullName"),
    email: m(locale, "auth.email"),
    createAccount: m(locale, "auth.createAccount"),
    confirmPassword: m(locale, "auth.confirmPassword"),
    confirmPasswordPlaceholder: m(locale, "auth.confirmPasswordPlaceholder"),
    agreeTerms: m(locale, "auth.agreeTerms"),
    errPasswordMismatch: m(locale, "auth.errPasswordMismatch"),
    errTermsRequired: m(locale, "auth.errTermsRequired"),
    errorGeneric: m(locale, "auth.errorGeneric"),
    fieldRequired: m(locale, "auth.fieldRequired"),
    resetLinkInPassword: m(locale, "auth.resetLinkInPassword"),
    googleContinue: m(locale, "auth.googleContinue"),
    googleRegister: m(locale, "auth.googleRegister"),
    googleSignInError: m(locale, "auth.googleSignInError"),
    forgotPassword: m(locale, "auth.forgotPassword"),
    errInvalidCredentials: m(locale, "auth.errInvalidCredentials"),
    errTooManyAttempts: m(locale, "auth.errTooManyAttempts"),
    errEmailInUse: m(locale, "auth.errEmailInUse"),
    errInvalidPayload: m(locale, "auth.errInvalidPayload"),
    orContinueSocial: m(locale, "auth.orContinueSocial"),
    telegramContinue: m(locale, "auth.telegramContinue"),
    telegramRegister: m(locale, "auth.telegramRegister"),
    telegramRegisterHint: m(locale, "auth.telegramRegisterHint"),
    telegramOpenBot: m(locale, "auth.telegramOpenBot"),
    telegramWaitingBot: m(locale, "auth.telegramWaitingBot"),
    telegramAwaitingPhone: m(locale, "auth.telegramAwaitingPhone"),
    telegramEnterCode: m(locale, "auth.telegramEnterCode"),
    telegramCodeSentHint: m(locale, "auth.telegramCodeSentHint"),
    telegramExpired: m(locale, "auth.telegramExpired"),
    telegramStep1: m(locale, "auth.telegramStep1"),
    telegramStep2: m(locale, "auth.telegramStep2"),
    telegramStep3: m(locale, "auth.telegramStep3"),
    telegramVerify: m(locale, "auth.telegramVerify"),
    telegramTooManyAttempts: m(locale, "auth.telegramTooManyAttempts"),
    telegramExpiresIn: m(locale, "auth.telegramExpiresIn"),
    telegramConfigWarning: m(locale, "auth.telegramConfigWarning"),
    badgeFast: m(locale, "auth.badgeFast"),
    back: m(locale, "common.back"),
    welcomeTitleLogin: m(locale, "auth.welcomeTitleLogin"),
    welcomeTitleRegister: m(locale, "auth.welcomeTitleRegister"),
    welcomeSubtitleLogin: m(locale, "auth.welcomeSubtitleLogin"),
    welcomeSubtitleRegister: m(locale, "auth.welcomeSubtitleRegister"),
    rememberMe: m(locale, "auth.rememberMe"),
    trustBooking: m(locale, "auth.trustBooking"),
    trustData: m(locale, "auth.trustData"),
    trustSupport: m(locale, "auth.trustSupport"),
    footerCopyright: m(locale, "auth.footerCopyright"),
    footerPrivacy: m(locale, "auth.footerPrivacy"),
    footerTerms: m(locale, "auth.footerTerms"),
    mobileChip1: m(locale, "auth.mobileChip1"),
    mobileChip2: m(locale, "auth.mobileChip2"),
    mobileChip3: m(locale, "auth.mobileChip3")
  };

  return (
    <SignInClient
      locale={locale}
      labels={labels}
      promoLabels={promoLabels}
      nextPath={searchParams?.next ?? null}
      googleOAuthEnabled={isGoogleOAuthConfigured()}
      telegramLoginEnabled={telegramLoginEnabled}
      telegramBotUsername={telegramBotUsername}
      showTelegramConfigWarning={showTelegramConfigWarning}
    />
  );
}
