import { isGoogleOAuthConfigured } from "@/lib/auth/googleOAuthEnv";
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
    emailFormTitle: m(locale, "auth.emailFormTitle"),
    loginLabel: m(locale, "auth.loginLabel"),
    emailPlaceholder: m(locale, "auth.emailPlaceholder"),
    password: m(locale, "auth.password"),
    passwordHint: m(locale, "auth.passwordHint"),
    passwordPlaceholder: m(locale, "auth.passwordPlaceholder"),
    showPassword: m(locale, "auth.showPassword"),
    hidePassword: m(locale, "auth.hidePassword"),
    signIn: m(locale, "auth.signIn"),
    signInHint: m(locale, "auth.signInHint"),
    registerTitle: m(locale, "auth.registerTitle"),
    firstName: m(locale, "auth.firstName"),
    lastName: m(locale, "auth.lastName"),
    phone: m(locale, "auth.phone"),
    email: m(locale, "auth.email"),
    emailOptional: m(locale, "auth.emailOptional"),
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
    ownerTabCta: m(locale, "auth.ownerTabCta"),
    ownerRegisterHint: m(locale, "auth.ownerRegisterHint"),
    googleSignIn: m(locale, "auth.googleSignIn"),
    googleSignInError: m(locale, "auth.googleSignInError"),
    forgotPassword: m(locale, "auth.forgotPassword"),
    becomeOwner: m(locale, "auth.becomeOwner"),
    createOwnerAccount: m(locale, "auth.createOwnerAccount"),
    errInvalidCredentials: m(locale, "auth.errInvalidCredentials"),
    errTooManyAttempts: m(locale, "auth.errTooManyAttempts"),
    errPhoneInUse: m(locale, "auth.errPhoneInUse"),
    errEmailInUse: m(locale, "auth.errEmailInUse"),
    errInvalidPayload: m(locale, "auth.errInvalidPayload"),
    errInvalidOtp: m(locale, "auth.errInvalidOtp"),
    stepWhoTitle: m(locale, "auth.stepWhoTitle"),
    stepPhoneTitle: m(locale, "auth.stepPhoneTitle"),
    stepCodeTitle: m(locale, "auth.stepCodeTitle"),
    roleGuest: m(locale, "auth.roleGuest"),
    roleOwner: m(locale, "auth.roleOwner"),
    getCode: m(locale, "auth.getCode"),
    enterCode: m(locale, "auth.enterCode"),
    retryIn: m(locale, "auth.retryIn"),
    retryNow: m(locale, "auth.retryNow"),
    yourName: m(locale, "auth.yourName"),
    createPassword: m(locale, "auth.createPassword"),
    continueBtn: m(locale, "auth.continueBtn"),
    back: m(locale, "common.back")
  };

  return (
    <SignInClient
      locale={locale}
      labels={labels}
      nextPath={searchParams?.next ?? null}
      googleOAuthEnabled={isGoogleOAuthConfigured()}
    />
  );
}
