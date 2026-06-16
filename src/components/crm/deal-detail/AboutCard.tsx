import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Check, Loader2, Pencil, X } from "lucide-react";
import { formatCurrency, formatDate } from "../../../lib/format";
import { Avatar } from "../ui";
import type {
  DealCompanyRef,
  DealDetailData,
  DealEditableField,
  DealFieldValue,
  DealPipelineRef,
  DealStageRef,
} from "../../../lib/queries/deal-detail";
import type { UserRef } from "../../../lib/queries/crm";

type FieldKind =
  | "text"
  | "textarea"
  | "number"
  | "currency"
  | "date"
  | "boolean"
  | "select";

interface FieldDef {
  field: DealEditableField;
  label: string;
  kind: FieldKind;
  options?: { value: string; label: string }[];
  render?: (d: DealDetailData) => ReactNode;
  rawValue?: (d: DealDetailData) => string;
}

const inputClass =
  "w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";

function valueOrDash(v: ReactNode) {
  if (v === null || v === undefined || v === "") {
    return <span className="text-slate-400">—</span>;
  }
  return v;
}

/** Converte o valor (string/número) para o tipo correto do campo. */
function normalize(kind: FieldKind, raw: unknown): DealFieldValue {
  const trimmed = String(raw ?? "").trim();
  if (kind === "boolean") {
    if (trimmed === "") return null;
    return trimmed === "true";
  }
  if (trimmed === "") return null;
  if (kind === "number" || kind === "currency") {
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  }
  return trimmed;
}

function initialOf(def: FieldDef, deal: DealDetailData): string {
  if (def.rawValue) return String(def.rawValue(deal) ?? "");
  const v = deal[def.field as keyof DealDetailData];
  if (v === null || v === undefined) return "";
  return String(v);
}

export function AboutCard({
  deal,
  users,
  pipelines,
  stages,
  companies,
  editing,
  saving,
  onEdit,
  onCancel,
  onSaveAll,
}: {
  deal: DealDetailData;
  users: UserRef[];
  pipelines: DealPipelineRef[];
  stages: DealStageRef[];
  companies: DealCompanyRef[];
  editing: boolean;
  saving: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSaveAll: (
    changes: Partial<Record<DealEditableField, DealFieldValue>>
  ) => void;
}) {
  const [draft, setDraft] = useState<Record<string, string>>({});

  // Etapas do pipeline atual (considera a troca de pipeline durante a edição).
  const activePipelineId = editing
    ? draft.pipeline_id ?? deal.pipeline_id
    : deal.pipeline_id;
  const pipelineStages = useMemo(
    () =>
      stages
        .filter((s) => s.pipeline_id === activePipelineId)
        .sort((a, b) => a.order - b.order),
    [stages, activePipelineId]
  );

  const fields: FieldDef[] = [
    {
      field: "responsible_id",
      label: "Proprietário do negócio",
      kind: "select",
      rawValue: (d) => d.responsible?.id ?? "",
      options: [
        { value: "", label: "— sem proprietário —" },
        ...users.map((u) => ({ value: u.id, label: u.name })),
      ],
      render: (d) =>
        d.responsible ? (
          <span className="flex items-center gap-1.5">
            <Avatar
              name={d.responsible.name}
              url={d.responsible.avatar_url}
              size={18}
            />
            {d.responsible.name}
          </span>
        ) : (
          <span className="text-slate-400">Nenhum proprietário</span>
        ),
    },
    {
      field: "total_value",
      label: "Valor",
      kind: "currency",
      rawValue: (d) => (d.total_value ?? "") as string,
      render: (d) =>
        d.total_value != null ? (
          <span className="font-semibold text-indigo-700">
            {formatCurrency(d.total_value)}
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      field: "forecast_date",
      label: "Data de fechamento",
      kind: "date",
      rawValue: (d) => d.forecast_date ?? "",
      render: (d) => valueOrDash(formatDate(d.forecast_date)),
    },
    {
      field: "stage_id",
      label: "Etapa do negócio",
      kind: "select",
      rawValue: (d) => d.stage_id,
      options: pipelineStages.map((s) => ({ value: s.id, label: s.name })),
      render: (d) => valueOrDash(d.stage?.name),
    },
    {
      field: "pipeline_id",
      label: "Pipeline",
      kind: "select",
      rawValue: (d) => d.pipeline_id,
      options: pipelines.map((p) => ({ value: p.id, label: p.name })),
      render: (d) => valueOrDash(d.pipeline?.name),
    },
    {
      field: "company_id",
      label: "Empresa",
      kind: "select",
      rawValue: (d) => d.company_id ?? "",
      options: [
        { value: "", label: "— sem empresa —" },
        ...companies.map((c) => ({
          value: c.id,
          label: c.trade_name || c.legal_name,
        })),
      ],
      render: (d) =>
        valueOrDash(d.company?.trade_name || d.company?.legal_name),
    },
  ];

  useEffect(() => {
    if (editing) {
      const next: Record<string, string> = { title: deal.title ?? "" };
      for (const def of fields) next[def.field] = initialOf(def, deal);
      setDraft(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, deal]);

  const handleSave = () => {
    const changes: Partial<Record<DealEditableField, DealFieldValue>> = {};
    for (const def of fields) {
      const initial = normalize(def.kind, initialOf(def, deal));
      const current = normalize(def.kind, draft[def.field] ?? "");
      if (current !== initial) {
        changes[def.field] = current;
      }
    }
    const titleNow = (draft.title ?? "").trim();
    if (titleNow && titleNow !== deal.title) {
      changes.title = titleNow;
    }
    onSaveAll(changes);
  };

  const setField = (field: string, value: string) =>
    setDraft((d) => ({ ...d, [field]: value }));

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-4">
        {editing ? (
          <input
            value={draft.title ?? ""}
            disabled={saving}
            onChange={(e) => setField("title", e.target.value)}
            placeholder="Nome do negócio"
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-base font-bold text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        ) : (
          <h2 className="text-base font-bold leading-snug text-slate-900">
            {deal.title}
          </h2>
        )}
        {editing ? (
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Check size={13} />
              )}
              Salvar
            </button>
            <button
              onClick={onCancel}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              <X size={13} /> Cancelar
            </button>
          </div>
        ) : (
          <button
            onClick={onEdit}
            className="flex w-max items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <Pencil size={13} /> Editar
          </button>
        )}
      </div>

      <div className="flex items-center justify-between px-4 py-2.5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Sobre esse negócio
        </h3>
      </div>

      <div className="divide-y divide-slate-100 px-4 pb-3">
        {fields.map((def) => (
          <div key={def.field} className="py-2">
            <div className="mb-0.5 text-xs font-medium text-slate-500">
              {def.label}
            </div>
            {editing ? (
              def.kind === "select" || def.kind === "boolean" ? (
                <select
                  value={draft[def.field] ?? ""}
                  disabled={saving}
                  onChange={(e) => setField(def.field, e.target.value)}
                  className={inputClass}
                >
                  {(def.kind === "boolean"
                    ? [
                        { value: "", label: "—" },
                        { value: "true", label: "Sim" },
                        { value: "false", label: "Não" },
                      ]
                    : def.options ?? []
                  ).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : def.kind === "textarea" ? (
                <textarea
                  value={draft[def.field] ?? ""}
                  disabled={saving}
                  rows={2}
                  onChange={(e) => setField(def.field, e.target.value)}
                  className={inputClass}
                />
              ) : (
                <input
                  type={
                    def.kind === "date"
                      ? "date"
                      : def.kind === "number" || def.kind === "currency"
                        ? "number"
                        : "text"
                  }
                  step={def.kind === "currency" ? "0.01" : undefined}
                  min={
                    def.kind === "currency" || def.kind === "number"
                      ? "0"
                      : undefined
                  }
                  value={draft[def.field] ?? ""}
                  disabled={saving}
                  onChange={(e) => setField(def.field, e.target.value)}
                  className={inputClass}
                />
              )
            ) : (
              <div className="text-sm text-slate-800">
                {def.render ? def.render(deal) : valueOrDash(initialOf(def, deal))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
