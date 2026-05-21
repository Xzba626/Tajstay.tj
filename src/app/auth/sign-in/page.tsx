import { isGoogleOAuthConfigured } from "@/lib/auth/googleOAuthEnv";
import { isFirebasePhoneAuthConfigured } from "@/lib/firebase/config";
import { isTelegramLoginConfigured } from "@/lib/telegram/config";
import { getLocale } from "@/lib/i18n/get-locale";
import { m } from "@/lib/i18n/messages";
import { SignInClient } from "./SignInClient";

export default function SignInPage({ searchParams }: { searchParams?: { next?: string } }) {
  const locale = getLocale();

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
    methodPhone: m(locale, "auth.methodPhone"),
    methodEmail: m(locale, "auth.methodEmail"),
    signInSubtitle: m(locale, "auth.signInSubtitle"),
    registerSubtitle: m(locale, "auth.registerSubtitle"),
    loginLabel: m(locale, "auth.loginLabel"),
    emailPlaceholder: m(locale, "auth.emailPlaceholder"),
    password: m(locale, "auth.password"),
    passwordPlaceholder: m(locale, "auth.passwordPlaceholder"),
    showPassword: m(locale, "auth.showPassword"),
    hidePassword: m(locale, "auth.hidePassword"),
    signIn: m(locale, "auth.signIn"),
    registerTitle: m(locale, "auth.registerTitle"),
    fullName: m(locale, "auth.fullName"),
    phone: m(locale, "auth.phone"),
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
    googleSignInError: m(locale, "auth.googleSignInError"),
    forgotPassword: m(locale, "auth.forgotPassword"),
    errInvalidCredentials: m(locale, "auth.errInvalidCredentials"),
    errTooManyAttempts: m(locale, "auth.errTooManyAttempts"),
    errPhoneInUse: m(locale, "auth.errPhoneInUse"),
    errEmailInUse: m(locale, "auth.errEmailInUse"),
    errInvalidPayload: m(locale, "auth.errInvalidPayload"),
    errInvalidOtp: m(locale, "auth.errInvalidOtp"),
    accountNotFound: m(locale, "auth.accountNotFound"),
    stepCodeTitle: m(locale, "auth.stepCodeTitle"),
    sentToLabel: m(locale, "auth.sentToLabel"),
    getCode: m(locale, "auth.getCode"),
    enterCode: m(locale, "auth.enterCode"),
    retryIn: m(locale, "auth.retryIn"),
    retryNow: m(locale, "auth.retryNow"),
    createPassword: m(locale, "auth.createPassword"),
    otpVerified: m(locale, "auth.otpVerified"),
    orContinueWith: m(locale, "auth.orContinueWith"),
    back: m(locale, "common.back"),
    telegramSignIn: m(locale, "auth.telegramSignIn"),
    telegramOpenBot: m(locale, "auth.telegramOpenBot"),
    telegramWaitingBot: m(locale, "auth.telegramWaitingBot"),
    telegramAwaitingConfirm: m(locale, "auth.telegramAwaitingConfirm"),
    telegramConfirmed: m(locale, "auth.telegramConfirmed"),
    telegramExpired: m(locale, "auth.telegramExpired"),
    telegramStep1: m(locale, "auth.telegramStep1"),
    telegramStep2: m(locale, "auth.telegramStep2"),
    telegramExpiresIn: m(locale, "auth.telegramExpiresIn")
  };

  return (
    <SignInClient
      locale={locale}
      labels={labels}
      nextPath={searchParams?.next ?? null}
      googleOAuthEnabled={isGoogleOAuthConfigured()}
      firebasePhoneAuthEnabled={isFirebasePhoneAuthConfigured()}
      telegramLoginEnabled={isTelegramLoginConfigured()}
    />
  );
}
