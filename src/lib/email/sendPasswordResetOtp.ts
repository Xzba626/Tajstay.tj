import { getEmailFrom } from "@/lib/email/from";
import { getResendClient } from "@/lib/email/resend";

export type SendPasswordResetOtpResult = { ok: true; skipped?: boolean } | { ok: false };

function formatCodeDisplay(code: string): string {
  const digits = code.replace(/\D/g, "").slice(0, 6);
  if (digits.length <= 3) return digits;
  return `${digits.slice(0, 3)} ${digits.slice(3)}`;
}

export async function sendPasswordResetOtpEmail(input: {
  to: string;
  code: string;
}): Promise<SendPasswordResetOtpResult> {
  const resend = getResendClient();
  if (!resend) {
    return { ok: true, skipped: true };
  }

  const from = getEmailFrom();
  const to = input.to.trim();
  const codeDisplay = formatCodeDisplay(input.code.trim());

  try {
    const { error } = await resend.emails.send({
      from,
      to,
      subject: "Код подтверждения TajStay",
      html: `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Код подтверждения TajStay</title>
</head>
<body style="margin:0;padding:0;background:#02110c;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#02110c;padding:24px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;border:1px solid rgba(110,231,183,0.22);border-radius:20px;background:linear-gradient(145deg, rgba(3,34,24,0.92), rgba(2,18,13,0.88));overflow:hidden;">
          <tr>
            <td style="padding:28px 24px 8px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="width:44px;height:44px;border-radius:14px;background:rgba(16,185,129,0.14);border:1px solid rgba(110,231,183,0.28);text-align:center;vertical-align:middle;">
                    <span style="display:inline-block;width:22px;height:22px;border-radius:6px;background:linear-gradient(135deg,#10b981,#047857);"></span>
                  </td>
                  <td style="padding-left:12px;font-size:20px;font-weight:800;color:#ecfdf5;letter-spacing:0.02em;">TajStay</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 24px 0;">
              <h1 style="margin:0;font-size:22px;line-height:1.25;color:#fffef7;font-weight:800;">Код подтверждения</h1>
              <p style="margin:10px 0 0;font-size:15px;line-height:1.55;color:rgba(236,253,245,0.78);">
                Используйте этот код для восстановления доступа к аккаунту TajStay
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 24px 8px;">
              <div style="border-radius:18px;border:1px solid rgba(110,231,183,0.24);background:rgba(3,32,22,0.82);padding:22px 16px;text-align:center;">
                <div style="font-size:42px;font-weight:900;letter-spacing:0.22em;color:#bbf7d0;line-height:1.1;font-variant-numeric:tabular-nums;">
                  ${codeDisplay}
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:4px 24px 0;text-align:center;">
              <p style="margin:0;font-size:14px;color:rgba(167,243,208,0.9);font-weight:600;">Код действует 10 минут</p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 24px 28px;">
              <p style="margin:0;font-size:13px;line-height:1.55;color:rgba(236,253,245,0.55);">
                Если это были не вы — просто проигнорируйте письмо.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `
    });

    if (error) {
      return { ok: false };
    }

    return { ok: true };
  } catch {
    return { ok: false };
  }
}
