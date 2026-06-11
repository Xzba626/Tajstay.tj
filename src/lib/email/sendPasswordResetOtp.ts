import { getEmailFrom } from "@/lib/email/from";
import { getResendClient } from "@/lib/email/resend";
import { renderPasswordResetEmail } from "@/lib/email/templates";

export type SendPasswordResetOtpResult = { ok: true; skipped?: boolean } | { ok: false };

export async function sendPasswordResetOtpEmail(input: {
  to: string;
  code: string;
}): Promise<SendPasswordResetOtpResult> {
  const resend = getResendClient();
  if (!resend) {
    return { ok: true, skipped: true };
  }

  const to = input.to.trim();
  if (!to) return { ok: false };

  try {
    const { error } = await resend.emails.send({
      from: getEmailFrom(),
      to,
      subject: "Восстановление пароля — TajStay",
      html: renderPasswordResetEmail(input.code.trim())
    });
    return error ? { ok: false } : { ok: true };
  } catch {
    return { ok: false };
  }
}
