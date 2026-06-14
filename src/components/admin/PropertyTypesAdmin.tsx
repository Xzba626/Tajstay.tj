"use client";

import { useCallback, useEffect, useState } from "react";
import { readClientLocale } from "@/lib/i18n/client-locale";
import { m } from "@/lib/i18n/messages";
import { SensitiveActionConfirmDialog } from "@/components/ui/SensitiveActionConfirmDialog";

type PropertyTypeRow = {
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

type Draft = {
  code: string;
  nameRu: string;
  nameTg: string;
  nameEn: string;
  icon: string;
  isActive: boolean;
};

const emptyDraft = (): Draft => ({
  code: "",
  nameRu: "",
  nameTg: "",
  nameEn: "",
  icon: "",
  isActive: true
});

export function PropertyTypesAdmin() {
  const [rows, setRows] = useState<PropertyTypeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [showCreate, setShowCreate] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const locale = readClientLocale();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/property-types", { credentials: "include" });
      const json = (await res.json()) as { data?: PropertyTypeRow[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Ошибка загрузки");
      setRows(json.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveEdit(id: string) {
    const res = await fetch(`/api/admin/property-types/${id}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: draft.code,
        nameRu: draft.nameRu,
        nameTg: draft.nameTg,
        nameEn: draft.nameEn,
        icon: draft.icon || null,
        isActive: draft.isActive
      })
    });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      window.alert(json.error ?? "Не удалось сохранить");
      return;
    }
    setEditingId(null);
    await load();
  }

  async function createRow() {
    const res = await fetch("/api/admin/property-types", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: draft.code,
        nameRu: draft.nameRu,
        nameTg: draft.nameTg,
        nameEn: draft.nameEn,
        icon: draft.icon || null,
        isActive: draft.isActive
      })
    });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      window.alert(json.error ?? "Не удалось создать");
      return;
    }
    setShowCreate(false);
    setDraft(emptyDraft());
    await load();
  }

  async function removeRow(id: string, hotelsCount: number) {
    if (hotelsCount > 0) {
      window.alert(`Нельзя удалить: ${hotelsCount} объект(ов) используют этот тип`);
      return;
    }
    setPendingDeleteId(id);
  }

  async function confirmRemoveRow() {
    if (!pendingDeleteId) return;
    setDeleteBusy(true);
    try {
      const res = await fetch(`/api/admin/property-types/${pendingDeleteId}`, {
        method: "DELETE",
        credentials: "include"
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        window.alert(json.error ?? "Не удалось удалить");
        return;
      }
      setPendingDeleteId(null);
      await load();
    } finally {
      setDeleteBusy(false);
    }
  }

  async function moveRow(id: string, direction: -1 | 1) {
    const index = rows.findIndex((r) => r.id === id);
    if (index < 0) return;
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    setRows(next);
    const res = await fetch("/api/admin/property-types/reorder", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: next.map((r) => r.id) })
    });
    if (!res.ok) await load();
  }

  function startEdit(row: PropertyTypeRow) {
    setEditingId(row.id);
    setDraft({
      code: row.code,
      nameRu: row.nameRu,
      nameTg: row.nameTg,
      nameEn: row.nameEn,
      icon: row.icon ?? "",
      isActive: row.isActive
    });
  }

  if (loading) return <p className="text-sm text-slate-400">Загрузка категорий…</p>;
  if (error) return <p className="text-sm text-red-300">{error}</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-300">Управление типами объектов для формы хоста и поиска.</p>
        <button
          type="button"
          className="btn-primary !w-auto px-4 py-2 text-sm"
          onClick={() => {
            setShowCreate(true);
            setEditingId(null);
            setDraft(emptyDraft());
          }}
        >
          + Добавить тип
        </button>
      </div>

      {showCreate ? (
        <div className="glass-panel space-y-3 rounded-2xl p-4">
          <h3 className="font-semibold text-white">Новая категория</h3>
          <DraftFields draft={draft} onChange={setDraft} />
          <div className="flex gap-2">
            <button type="button" className="btn-primary !w-auto px-4 py-2 text-sm" onClick={() => void createRow()}>
              Создать
            </button>
            <button type="button" className="btn-secondary !w-auto px-4 py-2 text-sm" onClick={() => setShowCreate(false)}>
              Отмена
            </button>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="min-w-full text-left text-sm text-slate-200">
          <thead className="bg-white/5 text-xs uppercase text-slate-400">
            <tr>
              <th className="px-3 py-2">Иконка</th>
              <th className="px-3 py-2">Русский</th>
              <th className="px-3 py-2">Таджикский</th>
              <th className="px-3 py-2">Английский</th>
              <th className="px-3 py-2">Активен</th>
              <th className="px-3 py-2">Порядок</th>
              <th className="px-3 py-2">Действия</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isEditing = editingId === row.id;
              const hotelsCount = row._count?.hotels ?? 0;
              return (
                <tr key={row.id} className="border-t border-white/10">
                  <td className="px-3 py-2">{isEditing ? <input className="ds-input w-24" value={draft.icon} onChange={(e) => setDraft({ ...draft, icon: e.target.value })} /> : (row.icon ?? "—")}</td>
                  <td className="px-3 py-2">{isEditing ? <input className="ds-input w-full min-w-[8rem]" value={draft.nameRu} onChange={(e) => setDraft({ ...draft, nameRu: e.target.value })} /> : row.nameRu}</td>
                  <td className="px-3 py-2">{isEditing ? <input className="ds-input w-full min-w-[8rem]" value={draft.nameTg} onChange={(e) => setDraft({ ...draft, nameTg: e.target.value })} /> : row.nameTg}</td>
                  <td className="px-3 py-2">{isEditing ? <input className="ds-input w-full min-w-[8rem]" value={draft.nameEn} onChange={(e) => setDraft({ ...draft, nameEn: e.target.value })} /> : row.nameEn}</td>
                  <td className="px-3 py-2">
                    {isEditing ? (
                      <input type="checkbox" checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} />
                    ) : row.isActive ? (
                      "✓"
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <button type="button" className="rounded border border-white/15 px-2 py-0.5" onClick={() => void moveRow(row.id, -1)} aria-label="Вверх">
                        ↑
                      </button>
                      <button type="button" className="rounded border border-white/15 px-2 py-0.5" onClick={() => void moveRow(row.id, 1)} aria-label="Вниз">
                        ↓
                      </button>
                      <span className="text-slate-400">{row.sortOrder}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      {isEditing ? (
                        <>
                          <button type="button" className="text-emerald-300" onClick={() => void saveEdit(row.id)}>
                            💾 Сохранить
                          </button>
                          <button type="button" className="text-slate-400" onClick={() => setEditingId(null)}>
                            Отмена
                          </button>
                        </>
                      ) : (
                        <>
                          <button type="button" className="text-emerald-300" onClick={() => startEdit(row)}>
                            ✏️ Изменить
                          </button>
                          <button type="button" className="text-red-300" onClick={() => void removeRow(row.id, hotelsCount)}>
                            🗑️ Удалить
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <SensitiveActionConfirmDialog
        open={pendingDeleteId != null}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={confirmRemoveRow}
        locale={locale}
        title={m(locale, "confirmDialog.deleteCategoryTitle")}
        description={m(locale, "confirmDialog.deleteCategoryDesc")}
        confirmLabel={m(locale, "confirmDialog.confirm")}
        variant="danger"
        busy={deleteBusy}
      />
    </div>
  );
}

function DraftFields({ draft, onChange }: { draft: Draft; onChange: (d: Draft) => void }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <label className="text-sm">
        Код
        <input className="ds-input mt-1 w-full" value={draft.code} onChange={(e) => onChange({ ...draft, code: e.target.value })} placeholder="HOTEL" />
      </label>
      <label className="text-sm">
        Иконка (lucide)
        <input className="ds-input mt-1 w-full" value={draft.icon} onChange={(e) => onChange({ ...draft, icon: e.target.value })} placeholder="hotel" />
      </label>
      <label className="text-sm">
        Русский
        <input className="ds-input mt-1 w-full" value={draft.nameRu} onChange={(e) => onChange({ ...draft, nameRu: e.target.value })} />
      </label>
      <label className="text-sm">
        Таджикский
        <input className="ds-input mt-1 w-full" value={draft.nameTg} onChange={(e) => onChange({ ...draft, nameTg: e.target.value })} />
      </label>
      <label className="text-sm md:col-span-2">
        Английский
        <input className="ds-input mt-1 w-full" value={draft.nameEn} onChange={(e) => onChange({ ...draft, nameEn: e.target.value })} />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={draft.isActive} onChange={(e) => onChange({ ...draft, isActive: e.target.checked })} />
        Активен
      </label>
    </div>
  );
}
