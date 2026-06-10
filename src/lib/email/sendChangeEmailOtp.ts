import { getEmailFrom } from "@/lib/email/from";
import { getResendClient } from "@/lib/email/resend";
import { confirmationCodeEmailSubject, renderConfirmationCodeEmail } from "@/lib/email/templates";

export async function sendChangeEmailOtpEmail(input: {
  to: string;
  code: string;
}): Promise<{ ok: true; skipped?: boolean } | { ok: false }> {
  const resend = getResendClient();
  if (!resend) return { ok: true, skipped: true };

  const to = input.to.trim();
  if (!to) return { ok: false };

  try {
    const { error } = await resend.emails.send({
      from: getEmailFrom(),
      to,
      subject: confirmationCodeEmailSubject("change_email"),
      html: renderConfirmationCodeEmail(input.code.trim(), "change_email")
    });
    return error ? { ok: false } : { ok: true };
  } catch {
    return { ok: false };
  }
}
