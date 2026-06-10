"use client";

import { useCallback, useEffect, useState } from "react";

type PropertyTypeAdmin = {
  id: string;
  code: string;
  nameRu: string;
  nameTg: string;
  nameEn: string;
  icon: string | null;
  isActive: boolean;
  sortOrder: number;
  _count?: { hotels: number };
};

const emptyForm = {
  code: "",
  nameRu: "",
  nameTg: "",
  nameEn: "",
  icon: "",
  isActive: true
};

export function AdminPropertyTypesPanel() {
  const [types, setTypes] = useState<PropertyTypeAdmin[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/property-types", { credentials: "include" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((json as { error?: string }).error ?? "Load failed");
    setTypes((json as { types: PropertyTypeAdmin[] }).types ?? []);
  }, []);

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "Error"));
  }, [load]);

  async function saveNew() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/property-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error ?? "Save failed");
      setForm(emptyForm);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(id: string) {
    setBusy(true);
    setError(null);
    try {
      const row = types.find((t) => t.id === id);
      if (!row) return;
      const res = await fetch(`/api/admin/property-types/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(row)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error ?? "Update failed");
      setEditingId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Удалить тип?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/property-types/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error ?? "Delete failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function move(id: string, dir: -1 | 1) {
    const idx = types.findIndex((t) => t.id === id);
    const swapIdx = idx + dir;
    if (idx < 0 || swapIdx < 0 || swapIdx >= types.length) return;
    const next = [...types];
    const tmp = next[idx]!.sortOrder;
    next[idx]!.sortOrder = next[swapIdx]!.sortOrder;
    next[swapIdx]!.sortOrder = tmp;
    [next[idx], next[swapIdx]] = [next[swapIdx]!, next[idx]!];
    setTypes(next);
    await fetch("/api/admin/property-types/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order: next.map((t, i) => ({ id: t.id, sortOrder: i + 1 }))
      })
    });
    await load();
  }

  function patchRow(id: string, patch: Partial<PropertyTypeAdmin>) {
    setTypes((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  return (
    <div className="space-y-6">
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Иконка</th>
              <th className="px-3 py-2">Код</th>
              <th className="px-3 py-2">Русский</th>
              <th className="px-3 py-2">Таджикский</th>
              <th className="px-3 py-2">Английский</th>
              <th className="px-3 py-2">Активен</th>
              <th className="px-3 py-2">Порядок</th>
              <th className="px-3 py-2">Действия</th>
            </tr>
          </thead>
          <tbody>
            {types.map((row, index) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="px-3 py-2">
                  {editingId === row.id ? (
                    <input
                      className="w-24 rounded border px-2 py-1"
                      value={row.icon ?? ""}
                      onChange={(e) => patchRow(row.id, { icon: e.target.value })}
                    />
                  ) : (
                    row.icon ?? "—"
                  )}
                </td>
                <td className="px-3 py-2 font-mono text-xs">{row.code}</td>
                {(["nameRu", "nameTg", "nameEn"] as const).map((field) => (
                  <td key={field} className="px-3 py-2">
                    {editingId === row.id ? (
                      <input
                        className="w-full min-w-[8rem] rounded border px-2 py-1"
                        value={row[field]}
                        onChange={(e) => patchRow(row.id, { [field]: e.target.value })}
                      />
                    ) : (
                      row[field]
                    )}
                  </td>
                ))}
                <td className="px-3 py-2">
                  {editingId === row.id ? (
                    <input
                      type="checkbox"
                      checked={row.isActive}
                      onChange={(e) => patchRow(row.id, { isActive: e.target.checked })}
                    />
                  ) : row.isActive ? (
                    "Да"
                  ) : (
                    "Нет"
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    <button type="button" disabled={index === 0 || busy} onClick={() => void move(row.id, -1)}>
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={index === types.length - 1 || busy}
                      onClick={() => void move(row.id, 1)}
                    >
                      ↓
                    </button>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    {editingId === row.id ? (
                      <>
                        <button
                          type="button"
                          className="rounded bg-emerald-700 px-2 py-1 text-white"
                          disabled={busy}
                          onClick={() => void saveEdit(row.id)}
                        >
                          Сохранить
                        </button>
                        <button type="button" onClick={() => setEditingId(null)}>
                          Отмена
                        </button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => setEditingId(row.id)}>
                          ✏️
                        </button>
                        <button
                          type="button"
                          disabled={busy || (row._count?.hotels ?? 0) > 0}
                          title={(row._count?.hotels ?? 0) > 0 ? "Есть объекты с этим типом" : undefined}
                          onClick={() => void remove(row.id)}
                        >
                          🗑️
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="font-semibold text-slate-900">Добавить тип</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <input
            placeholder="Код (APARTMENT)"
            className="rounded border px-3 py-2"
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
          />
          <input
            placeholder="Иконка (lucide)"
            className="rounded border px-3 py-2"
            value={form.icon}
            onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
          />
          <input
            placeholder="Русский"
            className="rounded border px-3 py-2"
            value={form.nameRu}
            onChange={(e) => setForm((f) => ({ ...f, nameRu: e.target.value }))}
          />
          <input
            placeholder="Таджикский"
            className="rounded border px-3 py-2"
            value={form.nameTg}
            onChange={(e) => setForm((f) => ({ ...f, nameTg: e.target.value }))}
          />
          <input
            placeholder="Английский"
            className="rounded border px-3 py-2 md:col-span-2"
            value={form.nameEn}
            onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))}
          />
        </div>
        <button
          type="button"
          disabled={busy}
          className="mt-3 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
          onClick={() => void saveNew()}
        >
          Добавить тип
        </button>
      </div>
    </div>
  );
}
