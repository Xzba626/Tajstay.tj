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

  const labels = {
    title: m(locale, "auth.title"),
    heading: m(locale, "auth.heading"),
    leftTitle: m(locale, "auth.leftTitle"),
    leftSubtitle: m(locale, "auth.leftSubtitle"),
    leftBenefit1: m(locale, "auth.leftBenefit1"),
    leftBenefit2: m(locale, "auth.leftBenefit2"),
    leftBenefit3: m(locale, "auth.leftBenefit3"),
    tabsSignIn: m(locale, "auth.tabsSignIn"),
    tabsRegister: m(locale, "auth.tabsRegister"),
    signInSubtitle: m(locale, "auth.signInSubtitle"),
    registerSubtitle: m(locale, "auth.registerSubtitle"),
    loginLabel: m(locale, "auth.loginLabel"),
    emailPlaceholder: m(locale, "auth.emailPlaceholder"),
    password: m(locale, "auth.password"),
    passwordPlaceholder: m(locale, "auth.passwordPlaceholder"),
    showPassword: m(locale, "auth.showPassword"),
    hidePassword: m(locale, "auth.hidePassword"),
    signIn: m(locale, "auth.signIn"),
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
    promo1: m(locale, "auth.promo1"),
    promo2: m(locale, "auth.promo2"),
    promo3: m(locale, "auth.promo3"),
    resetLinkInPassword: m(locale, "auth.resetLinkInPassword"),
    googleSignIn: m(locale, "auth.googleSignIn"),
    googleRegister: m(locale, "auth.googleRegister"),
    googleSignInError: m(locale, "auth.googleSignInError"),
    forgotPassword: m(locale, "auth.forgotPassword"),
    errInvalidCredentials: m(locale, "auth.errInvalidCredentials"),
    errTooManyAttempts: m(locale, "auth.errTooManyAttempts"),
    errEmailInUse: m(locale, "auth.errEmailInUse"),
    errInvalidPayload: m(locale, "auth.errInvalidPayload"),
    orUseEmail: m(locale, "auth.orUseEmail"),
    telegramSignIn: m(locale, "auth.telegramSignIn"),
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
    telegramNoCodeYet: m(locale, "auth.telegramNoCodeYet"),
    telegramExpiresIn: m(locale, "auth.telegramExpiresIn"),
    telegramConfigWarning: m(locale, "auth.telegramConfigWarning"),
    back: m(locale, "common.back")
  };

  return (
    <SignInClient
      locale={locale}
      labels={labels}
      nextPath={searchParams?.next ?? null}
      googleOAuthEnabled={isGoogleOAuthConfigured()}
      telegramLoginEnabled={telegramLoginEnabled}
      telegramBotUsername={telegramBotUsername}
      showTelegramConfigWarning={showTelegramConfigWarning}
    />
  );
}
