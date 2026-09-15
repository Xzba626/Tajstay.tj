import { X } from "lucide-react";
import Link from "next/link";
import type { User } from "@prisma/client";
import { m } from "@/lib/i18n/messages";
import type { Locale } from "@/lib/i18n/locale";
import { AdminNativeForm } from "@/components/admin/AdminNativeForm";
import { AdminSubmitButton } from "@/components/admin/AdminSubmitButton";

type Props = {
  open: boolean;
  closeHref: string;
  locale: Locale;
  admin: Pick<User, "phone" | "email">;
  securityError: string;
  securityMessage: string;
  securityOk: string;
  securityOkMessage: string;
  adminSecurityResetAvailable: boolean;
};

/**
 * ADM-16: `security/update` and `security/reset` are LIVE, real endpoints (BLOCK ADMIN 6.0
 * §26.5) — only their placement was wrong (buried inside the Content section, an unintuitive
 * spot for "change my own password"). This is the same JSX previously rendered inline in
 * page.tsx's Content branch, now reachable from the header profile menu at any section via
 * `?account=security`, with zero change to the endpoints, validation, or redirect semantics
 * beyond the redirect target itself (routes now send the admin back to `?account=security`
 * instead of `?section=content`).
 */
export function AdminSecurityPanel({
  open,
  closeHref,
  locale,
  admin,
  securityError,
  securityMessage,
  securityOk,
  securityOkMessage,
  adminSecurityResetAvailable
}: Props) {
  if (!open) return null;

  return (
    <div className="admin-confirm-overlay admin-security-overlay">
      <div className="admin-confirm-dialog admin-security-panel" role="dialog" aria-modal="true" aria-label={m(locale, "admin.securityPanelTitle")}>
        <div className="admin-security-panel__head">
          <div className="text-sm font-semibold">{m(locale, "admin.securityPanelTitle")}</div>
          <Link href={closeHref} className="admin-header__icon-btn" aria-label={m(locale, "admin.securityPanelClose")}>
            <X className="h-[18px] w-[18px]" aria-hidden />
          </Link>
        </div>

        <div className="admin-panel admin-panel--flat mt-3">
          <div className="text-sm font-semibold">{m(locale, "admin.securitySectionTitle")}</div>
          <p className="mt-1 text-sm text-[var(--admin-text-muted)]">{m(locale, "admin.securitySectionHint")}</p>
          <p className="mt-2 text-xs text-[var(--admin-text-muted)]">{m(locale, "admin.securityCurrentPasswordHint")}</p>
          {securityError && <div className="admin-alert admin-alert--error mt-3">{securityMessage}</div>}
          {securityOk && securityOkMessage && <div className="admin-alert admin-alert--success mt-3">{securityOkMessage}</div>}
          <AdminNativeForm action="/api/admin/security/update" method="post" className="admin-form-grid admin-form-grid--2 mt-4">
            <label className="admin-field">
              {m(locale, "admin.securityNewPhone")}
              <input name="phone" defaultValue={admin.phone} />
            </label>
            <label className="admin-field">
              {m(locale, "admin.securityNewEmail")}
              <input name="email" type="email" defaultValue={admin.email ?? ""} />
            </label>
            <label className="admin-field md:col-span-2">
              {m(locale, "admin.securityCurrentPassword")}
              <input name="currentPassword" type="password" required autoComplete="current-password" />
            </label>
            <label className="admin-field md:col-span-2">
              {m(locale, "admin.securityNewPassword")}
              <input name="newPassword" type="password" minLength={6} autoComplete="new-password" />
            </label>
            <AdminSubmitButton className="md:col-span-2" loadingLabel={m(locale, "admin.processing")}>
              {m(locale, "admin.securitySave")}
            </AdminSubmitButton>
          </AdminNativeForm>

          {adminSecurityResetAvailable && (
            <div className="mt-8 border-t border-[var(--admin-border)] pt-6">
              <div className="text-sm font-semibold">{m(locale, "admin.securityEmergencyTitle")}</div>
              <p className="mt-1 text-xs text-[var(--admin-text-muted)]">{m(locale, "admin.securityEmergencyHint")}</p>
              <AdminNativeForm action="/api/admin/security/reset" method="post" className="admin-form-grid admin-form-grid--2 mt-4">
                <label className="admin-field md:col-span-2">
                  {m(locale, "admin.securityEmergencyResetSecret")}
                  <input name="resetSecret" type="password" required />
                </label>
                <label className="admin-field">
                  {m(locale, "admin.securityNewPhone")}
                  <input name="phone" defaultValue={admin.phone} />
                </label>
                <label className="admin-field">
                  {m(locale, "admin.securityNewEmail")}
                  <input name="email" type="email" defaultValue={admin.email ?? ""} />
                </label>
                <label className="admin-field md:col-span-2">
                  {m(locale, "admin.securityNewPassword")}
                  <input name="newPassword" type="password" required minLength={6} />
                </label>
                <AdminSubmitButton variant="warning" className="md:col-span-2" loadingLabel={m(locale, "admin.processing")}>
                  {m(locale, "admin.securityEmergencyCta")}
                </AdminSubmitButton>
              </AdminNativeForm>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
