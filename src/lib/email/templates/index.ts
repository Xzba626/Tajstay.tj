export { EMAIL_BRAND } from "@/lib/email/templates/brand";
export { escapeHtml, formatOtpDisplay } from "@/lib/email/templates/escape";
export { renderEmailLayout } from "@/lib/email/templates/layout";
export {
  emailButton,
  emailDetailCard,
  emailDivider,
  emailFooter,
  emailHeader,
  emailMuted,
  emailOtpBlock,
  emailParagraph,
  emailStatusBlock,
  emailTitle
} from "@/lib/email/templates/components";
export { renderPasswordResetEmail } from "@/lib/email/templates/passwordReset";
export {
  confirmationCodeEmailSubject,
  renderConfirmationCodeEmail,
  type ConfirmationCodeEmailVariant
} from "@/lib/email/templates/confirmationCode";
export {
  bookingConfirmedEmailSubject,
  renderBookingConfirmedEmail,
  type BookingConfirmedEmailInput
} from "@/lib/email/templates/bookingConfirmed";
export {
  bookingCancelledEmailSubject,
  renderBookingCancelledEmail,
  type BookingCancelledBy,
  type BookingCancelledEmailInput
} from "@/lib/email/templates/bookingCancelled";
export {
  paymentConfirmedEmailSubject,
  renderPaymentConfirmedEmail,
  type PaymentConfirmedEmailInput
} from "@/lib/email/templates/paymentConfirmed";
export {
  ownerPayoutEmailSubject,
  renderOwnerPayoutEmail,
  type OwnerPayoutEmailInput
} from "@/lib/email/templates/ownerPayout";
export { renderEmailVerificationEmail } from "@/lib/email/templates/emailVerification";
