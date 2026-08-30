"use client";

import { usePathname, useSearchParams } from "next/navigation";

export type ToolbarField =
  | { kind: "search"; name: string; placeholder: string }
  | { kind: "select"; name: string; label: string; options: { value: string; label: string }[] };

export function AdminDataToolbar({
  section,
  fields,
  submitLabel
}: {
  section: string;
  fields: ToolbarField[];
  submitLabel: string;
}) {
  const pathname = usePathname();
  const search = useSearchParams();
  const formAction = pathname && pathname.length > 0 ? pathname : "/dashboard/admin";

  return (
    <form action={formAction} method="get" className="admin-panel admin-form-grid md:grid-cols-12">
      <input type="hidden" name="section" value={section} />
      {fields.map((f) => {
        if (f.kind === "search") {
          return (
            <label key={`${f.kind}:${f.name}`} className="admin-field md:col-span-5">
              <span className="sr-only">{f.placeholder}</span>
              <input name={f.name} defaultValue={search.get(f.name) ?? ""} placeholder={f.placeholder} />
            </label>
          );
        }
        return (
          <label key={`${f.kind}:${f.name}`} className="admin-field md:col-span-3">
            <span className="mb-1 block text-[0.625rem] font-semibold uppercase tracking-wide text-[var(--admin-text-muted)]">
              {f.label}
            </span>
            <select name={f.name} defaultValue={search.get(f.name) ?? ""}>
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        );
      })}
      <div className="md:col-span-1 md:flex md:items-end">
        <button type="submit" className="admin-btn admin-btn--primary admin-btn--sm h-11 w-full">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
