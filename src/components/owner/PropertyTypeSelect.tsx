"use client";

import { useEffect, useState } from "react";

type Props = {
  name?: string;
  defaultValue?: string;
  required?: boolean;
  className?: string;
};

export function PropertyTypeSelect({
  name = "propertyTypeId",
  defaultValue,
  required = true,
  className = "h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-green-800 focus:ring-2 focus:ring-green-800/20"
}: Props) {
  const [options, setOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/property-types", { credentials: "include" })
      .then((r) => r.json())
      .then((json: { data?: Array<{ id: string; name: string }> }) => {
        if (!cancelled) setOptions(json.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <select name={name} defaultValue={defaultValue} required={required} className={className} disabled={loading}>
      {loading ? <option value="">Загрузка…</option> : null}
      {!loading && !options.length ? <option value="">Нет категорий</option> : null}
      {options.map((opt) => (
        <option key={opt.id} value={opt.id}>
          {opt.name}
        </option>
      ))}
    </select>
  );
}
