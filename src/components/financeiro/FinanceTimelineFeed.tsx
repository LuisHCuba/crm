import { useMemo, useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Landmark,
  Calendar,
  Filter,
} from "lucide-react";
import type { TimelineEvent } from "../../lib/financeiro-timeline";
import { monthLabel, monthKey } from "../../lib/financeiro-timeline";
import { formatCurrency, formatDate } from "../../lib/format";

interface Props {
  events: TimelineEvent[];
  limit?: number;
}

export function FinanceTimelineFeed({ events, limit = 80 }: Props) {
  const [filter, setFilter] = useState<"all" | "in" | "out" | "forecast">("all");

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (filter === "in") return e.direction === "in";
      if (filter === "out") return e.direction === "out";
      if (filter === "forecast") return e.status === "forecast";
      return true;
    });
  }, [events, filter]);

  const groups = useMemo(() => {
    const map = new Map<string, TimelineEvent[]>();
    for (const e of filtered.slice(0, limit)) {
      const k = monthKey(e.date);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(e);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered, limit]);

  if (events.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-slate-400">
        Nenhum evento no período.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["all", "Todos"],
            ["in", "Entradas"],
            ["out", "Saídas"],
            ["forecast", "Previstos"],
          ] as const
        ).map(([v, label]) => (
          <button
            key={v}
            type="button"
            onClick={() => setFilter(v)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              filter === v
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="relative space-y-8 pl-4">
        <div className="absolute bottom-0 left-[7px] top-2 w-px bg-slate-200" />

        {groups.map(([key, items]) => (
          <div key={key} className="relative">
            <div className="mb-3 flex items-center gap-2">
              <span className="relative z-10 flex h-4 w-4 items-center justify-center rounded-full border-2 border-indigo-500 bg-white">
                <Calendar size={9} className="text-indigo-600" />
              </span>
              <h4 className="text-sm font-bold text-slate-800">{monthLabel(key)}</h4>
              <span className="text-xs text-slate-400">{items.length} evento(s)</span>
            </div>

            <ul className="space-y-2 pl-6">
              {items.map((e) => (
                <li
                  key={e.id}
                  className={`relative rounded-lg border px-3 py-2.5 text-sm ${
                    e.status === "forecast"
                      ? "border-dashed border-slate-200 bg-slate-50/80"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-2">
                      {e.direction === "in" ? (
                        <ArrowDownCircle
                          size={16}
                          className="mt-0.5 shrink-0 text-emerald-500"
                        />
                      ) : (
                        <ArrowUpCircle
                          size={16}
                          className="mt-0.5 shrink-0 text-rose-500"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-800">
                          {e.description}
                        </p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400">
                          <span>{formatDate(e.date)}</span>
                          {e.account && (
                            <span className="inline-flex items-center gap-0.5">
                              <Landmark size={10} /> {e.account}
                            </span>
                          )}
                          {e.category && <span>{e.category}</span>}
                          {e.status === "forecast" && (
                            <span className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-700">
                              previsto
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 font-semibold ${
                        e.direction === "in" ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {e.direction === "in" ? "+" : "−"}
                      {formatCurrency(e.amount)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {filtered.length > limit && (
          <p className="flex items-center gap-1 text-xs text-slate-400">
            <Filter size={12} /> Mostrando {limit} de {filtered.length} eventos
          </p>
        )}
      </div>
    </div>
  );
}
