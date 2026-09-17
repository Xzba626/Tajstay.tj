import { getEmailFrom } from "@/lib/email/from";
import { getResendClient } from "@/lib/email/resend";

export type SendEmailChangeOtpResult =
  | { ok: true }
  | { ok: false; skipped?: boolean };

function formatCodeDisplay(code: string): string {
  const digits = code.replace(/\D/g, "").slice(0, 6);
  if (digits.length <= 3) return digits;
  return `${digits.slice(0, 3)} ${digits.slice(3)}`;
}

/** OTP to the NEW email address for account email change (5 min TTL). Fail closed if Resend missing. */
export async function sendEmailChangeOtpEmail(input: {
  to: string;
  code: string;
}): Promise<SendEmailChangeOtpResult> {
  const resend = getResendClient();
  if (!resend) {
    return { ok: false, skipped: true };
  }

  const from = getEmailFrom();
  const to = input.to.trim();
  const codeDisplay = formatCodeDisplay(input.code.trim());

  try {
    const { error } = await resend.emails.send({
      from,
      to,
      subject: "TajStay — подтверждение нового email",
      html: `
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:24px;background:#f4f7f5;font-family:Inter,system-ui,sans-serif;color:#14231b;">
  <table role="presentation" width="100%" style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;border:1px solid #d8e5dd;">
    <tr><td style="background:#0F7A4D;padding:16px 20px;color:#fff;font-weight:800;">TajStay</td></tr>
    <tr><td style="padding:22px;">
      <h1 style="margin:0 0 10px;font-size:20px;">Код подтверждения email</h1>
      <p style="margin:0 0 16px;font-size:14px;color:#3d5248;">Введите этот код в TajStay, чтобы привязать новый email к аккаунту. Код действует 5 минут.</p>
      <div style="text-align:center;font-size:36px;font-weight:900;letter-spacing:0.2em;color:#0F7A4D;">${codeDisplay}</div>
      <p style="margin:16px 0 0;font-size:13px;color:#5a6f65;">Если вы не запрашивали смену email — проигнорируйте письмо.</p>
    </td></tr>
  </table>
</body>
</html>`
    });
    if (error) return { ok: false };
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
