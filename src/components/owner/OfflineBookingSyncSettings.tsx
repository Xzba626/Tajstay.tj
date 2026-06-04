"use client";

import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import type { OwnerPmsSettings } from "@/lib/pms/ownerPmsSettings";
import { FieldHelp } from "@/components/ui/FieldHelp";

type Props = {
  locale: Locale;
  settings: OwnerPmsSettings;
  saved?: boolean;
};

export function OfflineBookingSyncSettings({ locale, settings, saved }: Props) {
  return (
    <div className="offline-sync-card">
      <h3 className="offline-sync-card__title">{m(locale, "owner.offline.syncTitle")}</h3>
      <p className="offline-sync-card__hint">{m(locale, "owner.offline.syncHint")}</p>
      {saved ? (
        <p className="offline-sync-card__ok" role="status">
          {m(locale, "owner.offline.syncSaved")}
        </p>
      ) : null}

      <form action="/api/owner/offline-settings" method="post" className="offline-sync-card__form">
        <label className="offline-sync-card__row">
          <input type="checkbox" name="offlineCloudSync" value="1" defaultChecked={settings.offlineCloudSync} />
          <span className="flex flex-1 flex-wrap items-center gap-2">
            {m(locale, "owner.offline.syncCloud")}
            <FieldHelp locale={locale} helpKey="offlineSyncCloud" variant="dark" />
          </span>
        </label>
        <p className="offline-sync-card__note">{m(locale, "owner.offline.syncCloudNote")}</p>

        <div className="offline-sync-card__label-row flex flex-wrap items-center gap-2">
          <span className="offline-sync-card__label">{m(locale, "owner.offline.syncInterval")}</span>
          <FieldHelp locale={locale} helpKey="offlineSyncInterval" variant="dark" />
        </div>
        <select
          name="offlineSyncInterval"
          defaultValue={settings.offlineSyncInterval}
          className="offline-sync-card__select"
        >
          <option value="off">{m(locale, "owner.offline.syncIntervalOff")}</option>
          <option value="15m">{m(locale, "owner.offline.syncInterval15m")}</option>
          <option value="1h">{m(locale, "owner.offline.syncInterval1h")}</option>
          <option value="24h">{m(locale, "owner.offline.syncInterval24h")}</option>
        </select>

        <label className="offline-sync-card__row">
          <input type="checkbox" name="offlineBackupEmail" value="1" defaultChecked={settings.offlineBackupEmail} />
          <span>{m(locale, "owner.offline.syncEmail")}</span>
        </label>
        <label className="offline-sync-card__row">
          <input
            type="checkbox"
            name="offlineBackupTelegram"
            value="1"
            defaultChecked={settings.offlineBackupTelegram}
          />
          <span>{m(locale, "owner.offline.syncTelegram")}</span>
        </label>
        <p className="offline-sync-card__note">{m(locale, "owner.offline.syncComingSoon")}</p>

        <button type="submit" className="offline-sync-card__submit">
          {m(locale, "owner.offline.syncSave")}
        </button>
      </form>
    </div>
  );
}
