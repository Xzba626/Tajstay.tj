"use client";

import { useState } from "react";

type Prefs = { security: boolean; bookingUpdates: boolean };

type Labels = {
  groupTitle: string;
  security: string;
  securityHint: string;
  bookingUpdates: string;
  bookingUpdatesHint: string;
  saveError: string;
};

function ToggleRow({
  label,
  hint,
  checked,
  disabled,
  onChange
}: {
  label: string;
  hint: string;
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
}) {
  return (
    <label className="profile-subpage-toggle">
      <span className="profile-subpage-toggle__copy">
        <span className="profile-subpage-toggle__label">{label}</span>
        <span className="profile-subpage-toggle__hint">{hint}</span>
      </span>
      <input type="checkbox" className="profile-subpage-toggle__input" checked={checked} disabled={disabled} onChange={onChange} />
    </label>
  );
}

/** Real, backend-persisted notification category preferences — see profile/subscriptions/page.tsx
 * for why only these two categories exist. Optimistic UI update with rollback on a failed save,
 * so the toggle never silently lies about the actual saved state. */
export function NotificationPreferencesClient({ initial, labels }: { initial: Prefs; labels: Labels }) {
  const [prefs, setPrefs] = useState<Prefs>(initial);
  const [saving, setSaving] = useState<keyof Prefs | null>(null);
  const [error, setError] = useState(false);

  async function toggle(key: keyof Prefs) {
    const previous = prefs;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setSaving(key);
    setError(false);
    try {
      const res = await fetch("/api/profile/notification-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next)
      });
      if (!res.ok) throw new Error("save failed");
    } catch {
      setPrefs(previous);
      setError(true);
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="profile-subpage-group">
      <h2 className="profile-subpage-group__title">{labels.groupTitle}</h2>
      <div className="profile-subpage-group__body">
        <ToggleRow
          label={labels.security}
          hint={labels.securityHint}
          checked={prefs.security}
          disabled={saving === "security"}
          onChange={() => void toggle("security")}
        />
        <ToggleRow
          label={labels.bookingUpdates}
          hint={labels.bookingUpdatesHint}
          checked={prefs.bookingUpdates}
          disabled={saving === "bookingUpdates"}
          onChange={() => void toggle("bookingUpdates")}
        />
      </div>
      {error ? <p className="profile-subpage-row__badge" role="alert">{labels.saveError}</p> : null}
    </div>
  );
}
