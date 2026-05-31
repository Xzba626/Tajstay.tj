import { getEmailFrom } from "@/lib/email/from";
import { getResendClient } from "@/lib/email/resend";

export async function sendChangeEmailOtpEmail(input: {
  to: string;
  code: string;
}): Promise<{ ok: true; skipped?: boolean } | { ok: false }> {
  const resend = getResendClient();
  if (!resend) return { ok: true, skipped: true };

  const codeDisplay =
    input.code.length > 3 ? `${input.code.slice(0, 3)} ${input.code.slice(3)}` : input.code;

  try {
    const { error } = await resend.emails.send({
      from: getEmailFrom(),
      to: input.to.trim(),
      subject: "Подтверждение нового email — TajStay",
      html: `<p>Ваш код для смены email в TajStay: <strong>${codeDisplay}</strong></p><p>Код действует 10 минут.</p>`
    });
    return error ? { ok: false } : { ok: true };
  } catch {
    return { ok: false };
  }
}
