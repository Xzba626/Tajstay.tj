import { getResendClient } from "@/lib/email/resend";

export type SendPasswordResetOtpResult = { ok: true; skipped?: boolean } | { ok: false };

export async function sendPasswordResetOtpEmail(input: {
  to: string;
  code: string;
}): Promise<SendPasswordResetOtpResult> {
  const resend = getResendClient();
  if (!resend) {
    return { ok: true, skipped: true };
  }

  const from = (process.env.EMAIL_FROM || "Tajstay <no-reply@tajstay.site>").trim();
  const to = input.to.trim();
  const code = input.code.trim();

  try {
    const { error } = await resend.emails.send({
      from,
      to,
      subject: "Код восстановления пароля Tajstay",
      html: `
      <div style="background:#02110c;padding:28px;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#ecfdf5">
        <div style="max-width:520px;margin:0 auto;border:1px solid rgba(110,231,183,0.22);border-radius:18px;background:linear-gradient(145deg, rgba(3,34,24,0.86), rgba(2,18,13,0.82));padding:22px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
            <div style="width:36px;height:36px;border-radius:12px;background:rgba(16,185,129,0.12);border:1px solid rgba(110,231,183,0.22)"></div>
            <div style="font-weight:800;letter-spacing:0.2px">TajStay</div>
          </div>
          <h1 style="margin:10px 0 6px;font-size:18px;letter-spacing:-0.02em">Код восстановления пароля</h1>
          <p style="margin:0 0 14px;color:rgba(236,253,245,0.72);font-size:14px;line-height:1.6">
            Введите этот код на сайте TajStay. Код действует <b>10 минут</b>.
          </p>
          <div style="border-radius:16px;border:1px solid rgba(110,231,183,0.22);background:rgba(3,32,22,0.72);padding:14px;text-align:center">
            <div style="font-size:26px;font-weight:900;letter-spacing:0.2em;color:#bbf7d0">${code}</div>
          </div>
          <p style="margin:14px 0 0;color:rgba(236,253,245,0.55);font-size:12px;line-height:1.5">
            Если вы не запрашивали восстановление пароля — просто проигнорируйте это письмо.
          </p>
        </div>
      </div>
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
