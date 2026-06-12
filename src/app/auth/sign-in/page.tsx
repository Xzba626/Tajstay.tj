import { isGoogleOAuthConfigured } from "@/lib/auth/googleOAuthEnv";
import {
  getTelegramBotUsername,
  isTelegramLoginConfigured,
  isTelegramLoginUiEnabled
} from "@/lib/telegram/config";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { getSiteContent } from "@/lib/site-content";
import { getAuthPromoFeaturedHotel } from "@/lib/services/authPromoHotel";
import { SignInClient } from "./SignInClient";

export default async function SignInPage({
  searchParams
}: {
  searchParams?: { next?: string; mode?: string };
}) {
  const locale = getLocale();
  const content = await getSiteContent();
  const featuredHotel = await getAuthPromoFeaturedHotel();
  const telegramLoginEnabled = isTelegramLoginUiEnabled();
  const telegramApiReady = isTelegramLoginConfigured();
  const telegramBotUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.trim() || getTelegramBotUsername();
  const showTelegramConfigWarning =
    telegramLoginEnabled &&
    (!telegramApiReady || !process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.trim());

  const promoLabels = {
    badge: m(locale, "auth.promoBadge"),
    headingLine1: m(locale, "auth.promoHeadingLine1"),
    headingAccent: m(locale, "auth.promoHeadingAccent"),
    subtitle: m(locale, "auth.promoSubtitle"),
    benefit1Title: m(locale, "auth.promoBenefit1Title"),
    benefit1Text: m(locale, "auth.promoBenefit1Text"),
    benefit2Title: m(locale, "auth.promoBenefit2Title"),
    benefit2Text: m(locale, "auth.promoBenefit2Text"),
    benefit3Title: m(locale, "auth.promoBenefit3Title"),
    benefit3Text: m(locale, "auth.promoBenefit3Text"),
    previewGuestChoice: m(locale, "auth.previewGuestChoice"),
    previewPriceFrom: m(locale, "auth.previewPriceFrom"),
    previewAbstractTitle: m(locale, "auth.previewAbstractTitle"),
    previewAbstractRating: m(locale, "auth.previewAbstractRating"),
    previewAbstractConfirm: m(locale, "auth.previewAbstractConfirm"),
    trustSsl: m(locale, "auth.trustSsl"),
    trustVerified: m(locale, "auth.trustVerified"),
    trustNoFees: m(locale, "auth.trustNoFees"),
    trustInstant: m(locale, "auth.trustInstant")
  };

  const initialMode = searchParams?.mode === "register" ? "register" : "signIn";

  const labels = {
    cardTitleLogin: m(locale, "auth.cardTitleLogin"),
    cardSubtitleLogin: m(locale, "auth.cardSubtitleLogin"),
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
    agreeTermsIntro: m(locale, "auth.agreeTermsIntro"),
    agreeTermsAnd: m(locale, "auth.agreeTermsAnd"),
    policyLinkLabel: m(locale, "footer.policy"),
    termsLinkLabel: m(locale, "footer.terms"),
    errPasswordMismatch: m(locale, "auth.errPasswordMismatch"),
    errTermsRequired: m(locale, "auth.errTermsRequired"),
    errorGeneric: m(locale, "auth.errorGeneric"),
    fieldRequired: m(locale, "auth.fieldRequired"),
    resetLinkInPassword: m(locale, "auth.resetLinkInPassword"),
    googleContinue: m(locale, "auth.googleContinue"),
    googleRegister: m(locale, "auth.googleRegister"),
    googleSignInError: m(locale, "auth.googleSignInError"),
    forgotPassword: m(locale, "auth.forgotPasswordLink"),
    errInvalidCredentials: m(locale, "auth.errInvalidCredentials"),
    errTooManyAttempts: m(locale, "auth.errTooManyAttempts"),
    errEmailInUse: m(locale, "auth.errEmailInUse"),
    errInvalidPayload: m(locale, "auth.errInvalidPayload"),
    orContinueSocial: m(locale, "auth.orContinueSocial"),
    telegramContinue: m(locale, "auth.telegramContinue"),
    telegramRegister: m(locale, "auth.telegramRegister"),
    telegramRegisterHint: m(locale, "auth.telegramRegisterHint"),
    telegramFlowTitle: m(locale, "auth.telegramFlowTitle"),
    telegramFlowSubtitle: m(locale, "auth.telegramFlowSubtitle"),
    telegramStepsCompact: m(locale, "auth.telegramStepsCompact"),
    telegramHelpHow: m(locale, "auth.telegramHelpHow"),
    telegramBrowserFallback: m(locale, "auth.telegramBrowserFallback"),
    telegramCantOpenHelp: m(locale, "auth.telegramCantOpenHelp"),
    telegramManualHelp: m(locale, "auth.telegramManualHelp"),
    telegramBackToSignIn: m(locale, "auth.telegramBackToSignIn"),
    telegramAwaitingPhone: m(locale, "auth.telegramAwaitingPhone"),
    telegramEnterCode: m(locale, "auth.telegramEnterCode"),
    telegramCodePlaceholder: m(locale, "auth.telegramCodePlaceholder"),
    telegramVerifying: m(locale, "auth.telegramVerifying"),
    telegramCodeSuccess: m(locale, "auth.telegramCodeSuccess"),
    telegramCodeInvalid: m(locale, "auth.telegramCodeInvalid"),
    telegramCodeExpired: m(locale, "auth.telegramCodeExpired"),
    telegramVerify: m(locale, "auth.telegramVerify"),
    telegramTooManyAttempts: m(locale, "auth.telegramTooManyAttempts"),
    telegramExpiresIn: m(locale, "auth.telegramExpiresIn"),
    otpExpired: m(locale, "auth.otpExpired"),
    otpRequestNew: m(locale, "auth.otpRequestNew"),
    telegramResendOpen: m(locale, "auth.telegramResendOpen"),
    telegramConfigWarning: m(locale, "auth.telegramConfigWarning"),
    badgeFast: m(locale, "auth.badgeFast"),
    back: m(locale, "common.back"),
    welcomeTitleLogin: m(locale, "auth.welcomeTitleLogin"),
    welcomeTitleRegister: m(locale, "auth.welcomeTitleRegister"),
    welcomeSubtitleLogin: m(locale, "auth.welcomeSubtitleLogin"),
    welcomeSubtitleRegister: m(locale, "auth.welcomeSubtitleRegister"),
    rememberMe: m(locale, "auth.rememberMe"),
    noAccount: m(locale, "auth.noAccount"),
    switchToRegister: m(locale, "auth.switchToRegister"),
    hasAccount: m(locale, "auth.hasAccount"),
    switchToSignIn: m(locale, "auth.switchToSignIn"),
    footerCopyright: m(locale, "auth.footerCopyright"),
    footerPrivacy: m(locale, "auth.footerPrivacy"),
    footerTerms: m(locale, "auth.footerTerms"),
    mobileAuthBadge: m(locale, "auth.mobileAuthBadge"),
    mobileChip1: m(locale, "auth.mobileChip1"),
    mobileChip2: m(locale, "auth.mobileChip2"),
    mobileChip3: m(locale, "auth.mobileChip3")
  };

  return (
    <SignInClient
      locale={locale}
      labels={labels}
      promoLabels={promoLabels}
      brandMarkUrl={content.brand.logoMarkUrl}
      brandName={content.brand.siteName}
      featuredHotel={featuredHotel}
      initialMode={initialMode}
      nextPath={searchParams?.next ?? null}
      googleOAuthEnabled={isGoogleOAuthConfigured()}
      telegramLoginEnabled={telegramLoginEnabled}
      telegramBotUsername={telegramBotUsername}
      showTelegramConfigWarning={showTelegramConfigWarning}
    />
  );
}
