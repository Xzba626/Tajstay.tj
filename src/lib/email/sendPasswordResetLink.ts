import { getEmailFrom } from "@/lib/email/from";
import { getResendClient } from "@/lib/email/resend";

export type SendPasswordResetLinkResult =
  | { ok: true; skipped?: boolean }
  | { ok: false };

/**
 * Email a one-time password reset link. Never log the token.
 * If Resend is not configured, returns { ok: false } so callers fail closed
 * (do not expose plaintext token to admins).
 */
export async function sendPasswordResetLinkEmail(input: {
  to: string;
  resetUrl: string;
}): Promise<SendPasswordResetLinkResult> {
  const resend = getResendClient();
  if (!resend) {
    return { ok: false };
  }

  const from = getEmailFrom();
  const to = input.to.trim();
  const url = input.resetUrl.trim();
  if (!to || !url) return { ok: false };

  try {
    const { error } = await resend.emails.send({
      from,
      to,
      subject: "Восстановление доступа TajStay",
      html: `
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8" /><title>TajStay</title></head>
<body style="font-family:system-ui,sans-serif;background:#f7faf8;padding:24px;color:#14231b;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:24px;border:1px solid #dce7e1;">
    <h1 style="margin:0 0 12px;font-size:20px;">Восстановление доступа</h1>
    <p style="margin:0 0 16px;line-height:1.5;color:#66756d;">
      Администрация TajStay инициировала сброс пароля для вашего аккаунта владельца.
      Ссылка одноразовая и действует ограниченное время.
    </p>
    <p style="margin:0 0 20px;">
      <a href="${url.replace(/"/g, "&quot;")}" style="display:inline-block;background:#0f7a4d;color:#fff;text-decoration:none;padding:12px 18px;border-radius:12px;font-weight:700;">
        Задать новый пароль
      </a>
    </p>
    <p style="margin:0;font-size:13px;color:#66756d;line-height:1.45;">
      Если вы не ожидали это письмо, свяжитесь с поддержкой TajStay. Никому не пересылайте ссылку.
    </p>
  </div>
</body>
</html>`
    });
    if (error) return { ok: false };
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
