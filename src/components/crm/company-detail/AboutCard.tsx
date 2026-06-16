import { useEffect, useState, type ReactNode } from "react";
import { Building2, Check, Loader2, Pencil, X } from "lucide-react";
import { COMPANY_TYPE_LABELS } from "../labels";
import { Avatar } from "../ui";
import type { Company, CompanyType, UserRef } from "../../../lib/queries/crm";

export type CompanyEditableField =
  | "legal_name"
  | "trade_name"
  | "document"
  | "type"
  | "email"
  | "phone"
  | "address"
  | "responsible_id";

type FieldKind = "text" | "email" | "tel" | "textarea" | "select";

interface FieldDef {
  field: CompanyEditableField;
  label: string;
  kind: FieldKind;
  options?: { value: string; label: string }[];
  render?: (c: Company) => ReactNode;
  rawValue?: (c: Company) => string;
  /** Campos obrigatórios (não enviam null mesmo se esvaziados). */
  required?: boolean;
}

const TYPE_OPTIONS = (
  Object.entries(COMPANY_TYPE_LABELS) as [CompanyType, string][]
).map(([value, label]) => ({ value, label }));

const inputClass =
  "w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";

function valueOrDash(v: ReactNode) {
  if (v === null || v === undefined || v === "") {
    return <span className="text-slate-400">—</span>;
  }
  return v;
}

function initialOf(def: FieldDef, c: Company): string {
  if (def.rawValue) return def.rawValue(c);
  const v = c[def.field as keyof Company];
  return v == null ? "" : String(v);
}

export function CompanyAboutCard({
  company,
  users,
  editing,
  saving,
  onEdit,
  onCancel,
  onSaveAll,
}: {
  company: Company;
  users: UserRef[];
  editing: boolean;
  saving: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSaveAll: (
    changes: Partial<Record<CompanyEditableField, string | null>>
  ) => void;
}) {
  const fields: FieldDef[] = [
    {
      field: "responsible_id",
      label: "Proprietário",
      kind: "select",
      rawValue: (c) => c.responsible?.id ?? "",
      options: [
        { value: "", label: "— sem proprietário —" },
        ...users.map((u) => ({ value: u.id, label: u.name })),
      ],
      render: (c) =>
        c.responsible ? (
          <span className="flex items-center gap-1.5">
            <Avatar
              name={c.responsible.name}
              url={c.responsible.avatar_url}
              size={18}
            />
            {c.responsible.name}
          </span>
        ) : (
          <span className="text-slate-400">Nenhum proprietário</span>
        ),
    },
    { field: "legal_name", label: "Razão social", kind: "text", required: true },
    { field: "trade_name", label: "Nome fantasia", kind: "text" },
    { field: "document", label: "CNPJ", kind: "text", required: true },
    {
      field: "type",
      label: "Tipo",
      kind: "select",
      options: TYPE_OPTIONS,
      render: (c) => COMPANY_TYPE_LABELS[c.type],
    },
    {
      field: "email",
      label: "E-mail",
      kind: "email",
      render: (c) =>
        c.email ? (
          <a
            href={`mailto:${c.email}`}
            className="text-indigo-600 hover:underline"
          >
            {c.email}
          </a>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    { field: "phone", label: "Telefone", kind: "tel" },
    { field: "address", label: "Endereço", kind: "textarea" },
  ];

  const [draft, setDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editing) {
      const next: Record<string, string> = {};
      for (const def of fields) next[def.field] = initialOf(def, company);
      setDraft(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, company]);

  const handleSave = () => {
    const changes: Partial<Record<CompanyEditableField, string | null>> = {};
    for (const def of fields) {
      const initial = initialOf(def, company).trim();
      const current = (draft[def.field] ?? "").trim();
      if (current === initial) continue;
      if (current === "") {
        if (def.required) continue; // não esvazia campos obrigatórios
        changes[def.field] = null;
      } else {
        changes[def.field] = current;
      }
    }
    onSaveAll(changes);
  };

  const setField = (field: string, value: string) =>
    setDraft((d) => ({ ...d, [field]: value }));

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-col items-center gap-2 border-b border-slate-100 px-4 py-5 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
          <Building2 size={24} />
        </div>
        <h2 className="text-base font-bold text-slate-900">
          {company.trade_name || company.legal_name}
        </h2>
        {editing ? (
          <div className="mt-1 flex items-center gap-2">
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
            className="mt-1 flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <Pencil size={13} /> Editar
          </button>
        )}
      </div>

      <div className="flex items-center justify-between px-4 py-2.5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Sobre esta empresa
        </h3>
      </div>

      <div className="divide-y divide-slate-100 px-4 pb-3">
        {fields.map((def) => (
          <div key={def.field} className="py-2">
            <div className="mb-0.5 text-xs font-medium text-slate-500">
              {def.label}
            </div>
            {editing ? (
              def.kind === "select" ? (
                <select
                  value={draft[def.field] ?? ""}
                  disabled={saving}
                  onChange={(e) => setField(def.field, e.target.value)}
                  className={inputClass}
                >
                  {(def.options ?? []).map((o) => (
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
                    def.kind === "email"
                      ? "email"
                      : def.kind === "tel"
                        ? "tel"
                        : "text"
                  }
                  value={draft[def.field] ?? ""}
                  disabled={saving}
                  onChange={(e) => setField(def.field, e.target.value)}
                  className={inputClass}
                />
              )
            ) : (
              <div className="text-sm text-slate-800">
                {def.render
                  ? def.render(company)
                  : valueOrDash(initialOf(def, company))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
