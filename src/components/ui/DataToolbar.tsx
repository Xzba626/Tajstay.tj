"use client";

import { usePathname, useSearchParams } from "next/navigation";

export type ToolbarField =
  | { kind: "search"; name: string; placeholder: string }
  | { kind: "select"; name: string; label: string; options: { value: string; label: string }[] };

export function DataToolbar({
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
  // usePathname() может быть null на первом кадре — иначе Next 14 трактует action как Server Action "null".
  const formAction = pathname && pathname.length > 0 ? pathname : "/";

  return (
    <form action={formAction} method="get" className="glass-panel grid gap-3 rounded-2xl p-4 shadow-sm md:grid-cols-12">
      <input type="hidden" name="section" value={section} />
      {fields.map((f) => {
        if (f.kind === "search") {
          return (
            <label key={`${f.kind}:${f.name}`} className="md:col-span-5">
              <span className="sr-only">{f.placeholder}</span>
              <input
                name={f.name}
                defaultValue={search.get(f.name) ?? ""}
                placeholder={f.placeholder}
                className="ds-input h-11 w-full px-3 text-sm"
              />
            </label>
          );
        }
        return (
          <label key={`${f.kind}:${f.name}`} className="md:col-span-3">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">{f.label}</span>
            <select
              name={f.name}
              defaultValue={search.get(f.name) ?? ""}
              className="ds-input h-11 w-full px-3 text-sm"
            >
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
        <button
          type="submit"
          className="ds-primary-btn h-11 w-full px-4 text-sm"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

