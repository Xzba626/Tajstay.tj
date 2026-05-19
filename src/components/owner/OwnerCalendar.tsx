import type { Locale } from "@/lib/i18n/locale";
import { m } from "@/lib/i18n/messages";
import type { CalendarCellKind } from "@/lib/services/ownerCalendar";

type RoomRow = {
  id: number;
  title: string;
  hotel: { name: string };
};

type DayCol = { key: string; day: number; month: number };

const CELL_CLASS: Record<CalendarCellKind, string> = {
  available: "bg-emerald-200",
  blocked: "bg-slate-500",
  customPrice: "bg-violet-400",
  online: "bg-sky-500",
  offline: "bg-orange-400",
  onlinePending: "bg-amber-300"
};

export function OwnerCalendar({
  locale,
  rooms,
  days,
  cells
}: {
  locale: Locale;
  rooms: RoomRow[];
  days: DayCol[];
  cells: Record<string, CalendarCellKind>;
}) {
  const legend: { kind: CalendarCellKind; label: string }[] = [
    { kind: "available", label: m(locale, "owner.calendar.legend.available") },
    { kind: "online", label: m(locale, "owner.calendar.legend.online") },
    { kind: "offline", label: m(locale, "owner.calendar.legend.offline") },
    { kind: "onlinePending", label: m(locale, "owner.calendar.legend.pending") },
    { kind: "blocked", label: m(locale, "owner.calendar.legend.blocked") },
    { kind: "customPrice", label: m(locale, "owner.calendar.legend.customPrice") }
  ];

  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-semibold">{m(locale, "owner.calendar.gridTitle")}</div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
          {legend.map((item) => (
            <span key={item.kind} className="inline-flex items-center gap-1">
              <span className={`h-2.5 w-2.5 rounded ${CELL_CLASS[item.kind]}`} />
              {item.label}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-3 overflow-x-auto rounded-xl border">
        <table className="min-w-[980px] border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50">
              <th className="sticky left-0 z-10 border-b border-r bg-slate-50 px-3 py-2 text-left text-slate-700">
                {m(locale, "owner.calendar.roomCol")}
              </th>
              {days.map((d) => (
                <th key={d.key} className="border-b border-r px-2 py-2 text-slate-600">
                  {d.day}.{String(d.month).padStart(2, "0")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rooms.map((r) => (
              <tr key={r.id}>
                <td className="sticky left-0 z-10 border-b border-r bg-white px-3 py-2">
                  <div className="font-semibold text-slate-800">{r.title}</div>
                  <div className="text-[11px] text-slate-500">{r.hotel.name}</div>
                </td>
                {days.map((d) => {
                  const key = `${r.id}|${d.key}`;
                  const kind = cells[key] ?? "available";
                  const title = legend.find((l) => l.kind === kind)?.label ?? kind;
                  return (
                    <td key={key} className="border-b border-r px-1 py-1.5">
                      <div className={`mx-auto h-5 w-5 rounded ${CELL_CLASS[kind]}`} title={title} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

