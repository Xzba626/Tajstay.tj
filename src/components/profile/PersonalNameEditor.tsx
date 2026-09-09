"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  firstName: string;
  lastName: string;
  labels: {
    firstName: string;
    lastName: string;
    edit: string;
    save: string;
    saving: string;
    cancel: string;
    error: string;
    notSet: string;
  };
};

export function PersonalNameEditor({ firstName: initialFirst, lastName: initialLast, labels }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(initialFirst);
  const [lastName, setLastName] = useState(initialLast);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  async function save() {
    if (!firstName.trim()) return;
    setSaving(true);
    setError(false);
    try {
      const res = await fetch("/api/profile/update-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ firstName, lastName })
      });
      if (!res.ok) throw new Error("failed");
      setEditing(false);
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setFirstName(initialFirst);
    setLastName(initialLast);
    setError(false);
    setEditing(false);
  }

  if (!editing) {
    const fullName = initialLast ? `${initialFirst} ${initialLast}` : `${initialFirst} (${labels.notSet})`;
    return (
      <div className="profile-info-row">
        <span className="profile-info-row__label">{labels.firstName} / {labels.lastName}</span>
        <span className="profile-info-row__value">{fullName}</span>
        <button type="button" onClick={() => setEditing(true)} className="profile-info-row__edit-trigger">
          {labels.edit}
        </button>
      </div>
    );
  }

  return (
    <div className="profile-info-row profile-info-row--editing">
      <label className="profile-edit-field">
        <span className="profile-edit-field__label">{labels.firstName}</span>
        <input
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          maxLength={60}
          className="profile-edit-field__input"
          disabled={saving}
        />
      </label>
      <label className="profile-edit-field">
        <span className="profile-edit-field__label">{labels.lastName}</span>
        <input
          type="text"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          maxLength={60}
          className="profile-edit-field__input"
          disabled={saving}
        />
      </label>
      {error ? <p className="profile-edit-field__error">{labels.error}</p> : null}
      <div className="profile-edit-field__actions">
        <button type="button" onClick={() => void save()} disabled={saving || !firstName.trim()} className="profile-edit-field__save">
          {saving ? labels.saving : labels.save}
        </button>
        <button type="button" onClick={cancel} disabled={saving} className="profile-edit-field__cancel">
          {labels.cancel}
        </button>
      </div>
    </div>
  );
}
