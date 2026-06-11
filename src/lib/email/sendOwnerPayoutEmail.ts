import { safeSend } from "@/lib/email/safeSend";
import {
  ownerPayoutEmailSubject,
  renderOwnerPayoutEmail,
  type OwnerPayoutEmailInput
} from "@/lib/email/templates";

export async function sendOwnerPayoutEmail(input: OwnerPayoutEmailInput & { ownerEmail: string }) {
  const to = input.ownerEmail.trim();
  if (!to) return { ok: true as const, skipped: true };

  return safeSend({
    to,
    subject: ownerPayoutEmailSubject(input.amount, input.currency),
    html: renderOwnerPayoutEmail(input)
  });
}
