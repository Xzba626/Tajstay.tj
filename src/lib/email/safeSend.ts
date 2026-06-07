import { getEmailFrom } from "@/lib/email/from";
import { getResendClient } from "@/lib/email/resend";

export type SafeSendInput = {
  to: string;
  subject: string;
  html: string;
};

export type SafeSendResult = { ok: true; skipped?: boolean } | { ok: false };

/** Resend wrapper: no-op when RESEND_API_KEY is missing (dev). */
export async function safeSend(input: SafeSendInput): Promise<SafeSendResult> {
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
      subject: input.subject.trim(),
      html: input.html
    });
    if (error) return { ok: false };
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
