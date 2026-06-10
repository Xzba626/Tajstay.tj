import { EMAIL_BRAND as B } from "@/lib/email/templates/brand";
import { escapeHtml } from "@/lib/email/templates/escape";

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

const STATUS_STYLES: Record<StatusTone, { bg: string; border: string; text: string }> = {
  success: { bg: B.successBg, border: B.success, text: B.success },
  warning: { bg: B.warningBg, border: B.warning, text: B.warning },
  danger: { bg: B.dangerBg, border: B.danger, text: B.danger },
  info: { bg: B.infoBg, border: B.info, text: B.info },
  neutral: { bg: "#f8fafc", border: B.border, text: B.inkMuted }
};

export function emailHeader(params?: { preheader?: string }): string {
  const preheader = params?.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">${escapeHtml(params.preheader)}</div>`
    : "";

  return `${preheader}
  <tr>
    <td style="background:linear-gradient(135deg, ${B.greenDark} 0%, ${B.greenPrimary} 100%);padding:28px 32px 24px;border-radius:16px 16px 0 0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr>
          <td style="vertical-align:middle;">
            <div style="font-family:${B.fontDisplay};font-size:26px;font-weight:700;color:${B.white};letter-spacing:0.04em;line-height:1.1;">
              Taj<span style="color:${B.gold};">Stay</span>
            </div>
            <div style="margin-top:6px;font-family:${B.fontUi};font-size:12px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.72);">
              Tajikistan Stays
            </div>
          </td>
          <td align="right" style="vertical-align:middle;">
            <div style="width:48px;height:4px;background:linear-gradient(90deg, ${B.gold}, ${B.goldLine});border-radius:999px;margin-left:auto;"></div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="height:3px;background:linear-gradient(90deg, ${B.goldDark}, ${B.gold}, ${B.goldDark});font-size:0;line-height:0;">&nbsp;</td>
  </tr>`;
}

export function emailFooter(): string {
  const year = new Date().getFullYear();
  return `
  <tr>
    <td style="padding:28px 32px 32px;background:${B.cream};border-top:1px solid ${B.border};border-radius:0 0 16px 16px;">
      <p style="margin:0 0 8px;font-family:${B.fontUi};font-size:13px;line-height:1.6;color:${B.inkSoft};text-align:center;">
        © ${year} TajStay · Платформа бронирования жилья в Таджикистане
      </p>
      <p style="margin:0;font-family:${B.fontUi};font-size:12px;line-height:1.55;color:${B.inkSoft};text-align:center;">
        Это автоматическое письмо. Не отвечайте на него напрямую.
      </p>
    </td>
  </tr>`;
}

export function emailTitle(text: string): string {
  return `<h1 style="margin:0 0 12px;font-family:${B.fontDisplay};font-size:28px;line-height:1.2;font-weight:700;color:${B.ink};">${escapeHtml(text)}</h1>`;
}

export function emailParagraph(text: string): string {
  return `<p style="margin:0 0 16px;font-family:${B.fontUi};font-size:16px;line-height:1.65;color:${B.inkMuted};">${text}</p>`;
}

export function emailMuted(text: string): string {
  return `<p style="margin:16px 0 0;font-family:${B.fontUi};font-size:13px;line-height:1.55;color:${B.inkSoft};">${text}</p>`;
}

export function emailButton(label: string, href: string): string {
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label);
  return `
  <table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0 8px;">
    <tr>
      <td style="border-radius:12px;background:linear-gradient(135deg, ${B.greenButton}, ${B.greenPrimary});box-shadow:0 10px 24px rgba(7,26,16,0.18);">
        <a href="${safeHref}" style="display:inline-block;padding:14px 28px;font-family:${B.fontUi};font-size:15px;font-weight:700;color:${B.white};text-decoration:none;letter-spacing:0.02em;">
          ${safeLabel}
        </a>
      </td>
    </tr>
  </table>`;
}

export function emailOtpBlock(code: string, caption?: string): string {
  const display = escapeHtml(code);
  return `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0 8px;">
    <tr>
      <td align="center" style="padding:24px 20px;border-radius:16px;border:2px solid ${B.gold};background:linear-gradient(180deg, ${B.white} 0%, ${B.cream} 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,0.9), 0 12px 30px rgba(7,26,16,0.08);">
        <div style="font-family:${B.fontMono};font-size:40px;font-weight:700;letter-spacing:0.28em;color:${B.greenDark};line-height:1.1;font-variant-numeric:tabular-nums;">
          ${display}
        </div>
        ${caption ? `<div style="margin-top:12px;font-family:${B.fontUi};font-size:13px;font-weight:600;color:${B.goldDark};letter-spacing:0.06em;text-transform:uppercase;">${escapeHtml(caption)}</div>` : ""}
      </td>
    </tr>
  </table>`;
}

export function emailStatusBlock(tone: StatusTone, title: string, body?: string): string {
  const s = STATUS_STYLES[tone];
  return `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;">
    <tr>
      <td style="padding:16px 18px;border-radius:12px;border-left:4px solid ${s.border};background:${s.bg};">
        <div style="font-family:${B.fontUi};font-size:14px;font-weight:700;color:${s.text};margin-bottom:${body ? "6px" : "0"};">
          ${escapeHtml(title)}
        </div>
        ${body ? `<div style="font-family:${B.fontUi};font-size:14px;line-height:1.55;color:${B.inkMuted};">${body}</div>` : ""}
      </td>
    </tr>
  </table>`;
}

export function emailDetailCard(rows: Array<{ label: string; value: string }>): string {
  const rowHtml = rows
    .map(
      (row) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid ${B.border};font-family:${B.fontUi};font-size:13px;font-weight:600;color:${B.inkSoft};width:38%;vertical-align:top;">
          ${escapeHtml(row.label)}
        </td>
        <td style="padding:12px 0;border-bottom:1px solid ${B.border};font-family:${B.fontUi};font-size:15px;font-weight:600;color:${B.ink};vertical-align:top;">
          ${row.value}
        </td>
      </tr>`
    )
    .join("");

  return `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;border:1px solid ${B.border};border-radius:14px;overflow:hidden;background:${B.white};">
    <tr>
      <td style="padding:0 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          ${rowHtml}
        </table>
      </td>
    </tr>
  </table>`;
}

export function emailDivider(): string {
  return `<div style="height:1px;background:${B.border};margin:24px 0;"></div>`;
}
