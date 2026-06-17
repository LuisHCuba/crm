import { useMemo, type DragEvent } from "react";
import { Link } from "react-router-dom";
import { Building2, CalendarDays } from "lucide-react";
import { formatCurrency, formatDate } from "../../../lib/format";
import { STAGE_TYPE_DOT } from "../labels";
import { Avatar } from "../ui";
import type { DealListItem, Stage, StageType } from "../../../lib/queries/crm";

const TYPE_DEFAULT_PROB: Record<StageType, number> = {
  open: 50,
  won: 100,
  lost: 0,
};

function stageProbability(stage: Stage): number {
  if (stage.probability != null) return Number(stage.probability);
  return TYPE_DEFAULT_PROB[stage.type];
}

function dealDate(d: DealListItem): { label: string; value: string } | null {
  if (d.closed_at)
    return { label: "Fechamento", value: formatDate(d.closed_at) };
  if (d.forecast_date)
    return { label: "Previsão", value: formatDate(d.forecast_date) };
  if (d.created_at) return { label: "Criação", value: formatDate(d.created_at) };
  return null;
}

export function DealBoard({
  stages,
  deals,
  onMoveRequest,
  dragId,
  onDragChange,
  overStage,
  onOverStage,
}: {
  stages: Stage[];
  deals: DealListItem[];
  onMoveRequest: (deal: DealListItem, stage: Stage) => void;
  dragId: string | null;
  onDragChange: (id: string | null) => void;
  overStage: string | null;
  onOverStage: (id: string | null) => void;
}) {
  const dealsByStage = useMemo(() => {
    const map: Record<string, DealListItem[]> = {};
    for (const s of stages) map[s.id] = [];
    for (const d of deals) {
      if (map[d.stage_id]) map[d.stage_id].push(d);
    }
    return map;
  }, [stages, deals]);

  const handleDrop = (stage: Stage) => {
    onOverStage(null);
    const deal = deals.find((d) => d.id === dragId);
    onDragChange(null);
    if (!deal || deal.stage_id === stage.id) return;
    onMoveRequest(deal, stage);
  };

  const onDragStart = (e: DragEvent, id: string) => {
    onDragChange(id);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto pb-2">
      {stages.map((stage) => {
        const list = dealsByStage[stage.id] ?? [];
        const total = list.reduce(
          (sum, d) => sum + Number(d.total_value ?? 0),
          0
        );
        const prob = stageProbability(stage);
        const weighted = total * (prob / 100);
        return (
          <div
            key={stage.id}
            onDragOver={(e) => {
              e.preventDefault();
              onOverStage(stage.id);
            }}
            onDragLeave={() =>
              onOverStage(overStage === stage.id ? null : overStage)
            }
            onDrop={() => handleDrop(stage)}
            className={`flex w-72 shrink-0 flex-col rounded-xl border bg-slate-100/70 transition ${
              overStage === stage.id
                ? "border-indigo-400 ring-2 ring-indigo-300"
                : "border-slate-200"
            }`}
          >
            {/* Cabeçalho da coluna */}
            <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2.5">
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${STAGE_TYPE_DOT[stage.type]}`}
              />
              <span className="truncate text-sm font-semibold text-slate-700">
                {stage.name}
              </span>
              <span className="ml-auto rounded bg-slate-200/70 px-1.5 py-0.5 text-xs font-semibold text-slate-500">
                {list.length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex-1 space-y-2 overflow-y-auto p-2">
              {list.map((d) => (
                <Link
                  key={d.id}
                  to={`/negocios/${d.id}`}
                  draggable
                  onDragStart={(e) => onDragStart(e, d.id)}
                  onDragEnd={() => onDragChange(null)}
                  className={`block cursor-grab rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm transition hover:border-indigo-300 hover:shadow active:cursor-grabbing ${
                    dragId === d.id ? "opacity-50" : ""
                  }`}
                >
                  <p className="truncate text-sm font-semibold text-indigo-700">
                    {d.title}
                  </p>
                  {d.company && (
                    <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
                      <Building2 size={11} />
                      {d.company.trade_name || d.company.legal_name}
                    </p>
                  )}
                  <p className="mt-1.5 text-xs text-slate-500">
                    Valor:{" "}
                    <span className="font-semibold text-slate-800">
                      {formatCurrency(d.total_value)}
                    </span>
                  </p>
                  {(() => {
                    const dt = dealDate(d);
                    return (
                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        {dt ? (
                          <span className="flex items-center gap-1 text-xs text-slate-400">
                            <CalendarDays size={11} />
                            {dt.label}: {dt.value}
                          </span>
                        ) : (
                          <span />
                        )}
                        {d.responsible && (
                          <Avatar
                            name={d.responsible.name}
                            url={d.responsible.avatar_url}
                            size={20}
                          />
                        )}
                      </div>
                    );
                  })()}
                </Link>
              ))}
              {list.length === 0 && (
                <p className="px-2 py-6 text-center text-xs text-slate-400">
                  Arraste negócios para cá
                </p>
              )}
            </div>

            {/* Rodapé: valor total + ponderado */}
            <div className="space-y-0.5 border-t border-slate-200 px-3 py-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">
                  {formatCurrency(total)}
                </span>
                <span className="text-slate-400">Valor total</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-500">
                  {formatCurrency(weighted)}{" "}
                  <span className="font-normal text-slate-400">
                    ({prob}%)
                  </span>
                </span>
                <span className="text-slate-400">Valor ponderado</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
