import { Plus, Trash2, Split } from "lucide-react";
import type { RefCategory, RefCostCenter } from "../../lib/queries/financeiro";
import {
  num,
  round2,
  validateApportionment,
  type ApportionmentInput,
} from "../../lib/financeiro-utils";
import { inputCls } from "./ui";

export function ApportionmentEditor({
  items,
  onChange,
  total,
  categories,
  costCenters,
}: {
  items: ApportionmentInput[];
  onChange: (items: ApportionmentInput[]) => void;
  total: number;
  categories: RefCategory[];
  costCenters: RefCostCenter[];
}) {
  const update = (i: number, patch: Partial<ApportionmentInput>) => {
    const next = items.map((it, idx) => (idx === i ? { ...it, ...patch } : it));
    onChange(next);
  };
  const add = () =>
    onChange([
      ...items,
      { category_id: null, cost_center_id: null, percentage: null, value: 0 },
    ]);
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));

  const distributeEqually = () => {
    if (items.length === 0 || total <= 0) return;
    const per = round2(total / items.length);
    const next = items.map((it, idx) => ({
      ...it,
      value: idx === items.length - 1 ? round2(total - per * (items.length - 1)) : per,
      percentage: round2((per / total) * 100),
    }));
    onChange(next);
  };

  const validation = validateApportionment(items, total);

  if (items.length === 0) {
    return (
      <button
        type="button"
        onClick={add}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 py-3 text-sm font-medium text-slate-500 hover:border-indigo-400 hover:text-indigo-600"
      >
        <Split size={16} /> Adicionar rateio por categoria / centro de custo
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Rateio
        </span>
        <button
          type="button"
          onClick={distributeEqually}
          className="text-xs font-medium text-indigo-600 hover:underline"
        >
          Distribuir igualmente
        </button>
      </div>

      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-2">
          <select
            value={it.category_id ?? ""}
            onChange={(e) => update(i, { category_id: e.target.value || null })}
            className={inputCls + " flex-1"}
          >
            <option value="">Categoria…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={it.cost_center_id ?? ""}
            onChange={(e) => update(i, { cost_center_id: e.target.value || null })}
            className={inputCls + " flex-1"}
          >
            <option value="">Centro de custo…</option>
            {costCenters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <div className="relative w-24">
            <input
              type="number"
              step="0.01"
              min="0"
              value={it.percentage ?? ""}
              placeholder="%"
              onChange={(e) => {
                const pct = e.target.value === "" ? null : num(e.target.value);
                update(i, {
                  percentage: pct,
                  value: pct == null ? it.value : round2((pct / 100) * total),
                });
              }}
              className={inputCls + " pr-6 text-right"}
            />
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">
              %
            </span>
          </div>
          <input
            type="number"
            step="0.01"
            min="0"
            value={it.value || ""}
            placeholder="Valor"
            onChange={(e) => {
              const v = num(e.target.value);
              update(i, {
                value: v,
                percentage: total > 0 ? round2((v / total) * 100) : null,
              });
            }}
            className={inputCls + " w-28 text-right"}
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}

      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline"
        >
          <Plus size={14} /> Adicionar linha
        </button>
        <span
          className={`text-xs font-medium ${
            validation.ok ? "text-emerald-600" : "text-red-600"
          }`}
        >
          Soma: {validation.sum.toFixed(2)} / {round2(total).toFixed(2)}
        </span>
      </div>
      {!validation.ok && validation.message && (
        <p className="text-xs text-red-600">{validation.message}</p>
      )}
    </div>
  );
}
