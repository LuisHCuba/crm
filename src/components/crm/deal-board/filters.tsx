import { ChevronDown } from "lucide-react";

/** Presets de intervalo de datas usados nos filtros (estilo HubSpot). */
export type DatePreset = "" | "today" | "7d" | "30d" | "month";

export const DATE_PRESET_OPTIONS: { value: DatePreset; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "7d", label: "Últimos 7 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "month", label: "Este mês" },
];

/**
 * Converte um preset em um fragmento de filtro Hasura ({ _gte, _lte }) sobre
 * uma coluna timestamptz/date. Retorna null quando não há filtro.
 */
export function datePresetToRange(
  preset: DatePreset
): { _gte: string; _lte?: string } | null {
  if (!preset) return null;
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  switch (preset) {
    case "today":
      return { _gte: start.toISOString() };
    case "7d":
      start.setDate(start.getDate() - 6);
      return { _gte: start.toISOString() };
    case "30d":
      start.setDate(start.getDate() - 29);
      return { _gte: start.toISOString() };
    case "month": {
      const first = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      return { _gte: first.toISOString() };
    }
    default:
      return null;
  }
}

/** Pílula de filtro por intervalo de datas — funcional via `where`. */
export function DateRangePill({
  label,
  value,
  onChange,
}: {
  label: string;
  value: DatePreset;
  onChange: (v: DatePreset) => void;
}) {
  const active = value !== "";
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as DatePreset)}
        className={`peer cursor-pointer appearance-none rounded-full border py-1.5 pl-3 pr-8 text-sm font-medium outline-none transition ${
          active
            ? "border-indigo-300 bg-indigo-50 text-indigo-700"
            : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
        }`}
      >
        <option value="">{label}</option>
        {DATE_PRESET_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 ${
          active ? "text-indigo-600" : "text-slate-400"
        }`}
      />
    </div>
  );
}
