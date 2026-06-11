import { EMAIL_BRAND as B } from "@/lib/email/templates/brand";
import { emailFooter, emailHeader } from "@/lib/email/templates/components";
import { escapeHtml } from "@/lib/email/templates/escape";

export type EmailLayoutOptions = {
  title: string;
  preheader?: string;
  body: string;
};

export function renderEmailLayout(options: EmailLayoutOptions): string {
  const title = escapeHtml(options.title);
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${title}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td { font-family: Arial, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background:${B.greenDeep};font-family:${B.fontUi};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  ${options.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(options.preheader)}</div>` : ""}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:linear-gradient(180deg, ${B.greenDeep} 0%, #0b2418 100%);padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:${B.maxWidth}px;background:${B.white};border-radius:16px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,0.28);">
          ${emailHeader({ preheader: options.preheader })}
          <tr>
            <td style="padding:32px 32px 8px;background:${B.cream};">
              ${options.body}
            </td>
          </tr>
          ${emailFooter()}
        </table>
        <div style="max-width:${B.maxWidth}px;margin:16px auto 0;font-family:${B.fontUi};font-size:11px;line-height:1.5;color:rgba(240,253,244,0.45);text-align:center;">
          TajStay · www.tajstay.site
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
