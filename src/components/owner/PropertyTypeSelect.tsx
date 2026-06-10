"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n/locale";
import { propertyTypeLabel, type PropertyTypeRow } from "@/lib/propertyTypes/labels";

type Props = {
  locale: Locale;
  name?: string;
  defaultTypeId?: string | null;
  defaultCode?: string | null;
  className?: string;
  required?: boolean;
};

export function PropertyTypeSelect({
  locale,
  name = "propertyTypeId",
  defaultTypeId,
  defaultCode,
  className,
  required
}: Props) {
  const [types, setTypes] = useState<PropertyTypeRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/property-types", { credentials: "include" })
      .then((r) => r.json())
      .then((json: { types?: PropertyTypeRow[] }) => {
        if (!cancelled) setTypes(json.types ?? []);
      })
      .catch(() => {
        if (!cancelled) setTypes([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const resolvedDefault =
    defaultTypeId ??
    types.find((t) => t.code === (defaultCode ?? "HOTEL").toUpperCase())?.id ??
    types[0]?.id ??
    "";

  return (
    <select
      name={name}
      defaultValue={resolvedDefault}
      required={required}
      disabled={loading || !types.length}
      className={className}
    >
      {types.map((t) => (
        <option key={t.id} value={t.id}>
          {propertyTypeLabel(locale, t)}
        </option>
      ))}
    </select>
  );
}
