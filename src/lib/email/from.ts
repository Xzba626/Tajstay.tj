/** Default From for transactional mail (Resend). Override with EMAIL_FROM in env. */
const DEFAULT_EMAIL_FROM = "TajStay <support@tajstay.site>";

export function getEmailFrom(): string {
  return (process.env.EMAIL_FROM?.trim() || DEFAULT_EMAIL_FROM).trim();
}
