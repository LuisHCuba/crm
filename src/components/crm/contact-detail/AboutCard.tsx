import { useEffect, useState, type ReactNode } from "react";
import { Check, Loader2, Pencil, X } from "lucide-react";
import {
  CONTACT_ORIGIN_LABELS,
  CONTACT_STAGE_LABELS,
} from "../labels";
import { Avatar } from "../ui";
import type {
  ContactDetailData,
  ContactEditableField,
} from "../../../lib/queries/contact-detail";
import type { UserRef } from "../../../lib/queries/crm";

type FieldKind = "text" | "email" | "tel" | "textarea" | "select";

interface FieldDef {
  field: ContactEditableField;
  label: string;
  kind: FieldKind;
  options?: { value: string; label: string }[];
  render?: (c: ContactDetailData) => ReactNode;
  rawValue?: (c: ContactDetailData) => string;
}

const STAGE_OPTIONS = Object.entries(CONTACT_STAGE_LABELS).map(
  ([value, label]) => ({ value, label })
);
const ORIGIN_OPTIONS = [
  { value: "", label: "— sem origem —" },
  ...Object.entries(CONTACT_ORIGIN_LABELS).map(([value, label]) => ({
    value,
    label,
  })),
];

const inputClass =
  "w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";

function valueOrDash(v: ReactNode) {
  if (v === null || v === undefined || v === "") {
    return <span className="text-slate-400">—</span>;
  }
  return v;
}

/** Valor inicial (string) de um campo a partir do contato. */
function initialOf(def: FieldDef, contact: ContactDetailData): string {
  return (
    def.rawValue?.(contact) ??
    ((contact[def.field as keyof ContactDetailData] as string | null) ?? "")
  );
}

export function AboutCard({
  contact,
  users,
  editing,
  saving,
  onEdit,
  onCancel,
  onSaveAll,
}: {
  contact: ContactDetailData;
  users: UserRef[];
  editing: boolean;
  saving: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSaveAll: (
    changes: Partial<Record<ContactEditableField, string | null>>
  ) => void;
}) {
  const fields: FieldDef[] = [
    {
      field: "responsible_id",
      label: "Proprietário do contato",
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
    { field: "phone", label: "Número do telefone", kind: "tel" },
    { field: "mobile_phone", label: "Número do celular", kind: "tel" },
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
    {
      field: "stage",
      label: "Fase do ciclo de vida",
      kind: "select",
      options: STAGE_OPTIONS,
      render: (c) => CONTACT_STAGE_LABELS[c.stage],
    },
    { field: "job_title", label: "Cargo", kind: "text" },
    {
      field: "origin",
      label: "Origem",
      kind: "select",
      options: ORIGIN_OPTIONS,
      render: (c) =>
        c.origin ? (
          CONTACT_ORIGIN_LABELS[c.origin]
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
  ];

  const [draft, setDraft] = useState<Record<string, string>>({});

  // Ao ENTRAR em modo de edição, inicializa o rascunho com os valores atuais.
  // Depende só de `editing`: um refetch do registro (ex.: nova atividade na
  // timeline) não pode apagar o que o usuário está digitando.
  useEffect(() => {
    if (editing) {
      const next: Record<string, string> = {};
      for (const def of fields) next[def.field] = initialOf(def, contact);
      setDraft(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const handleSave = () => {
    const changes: Partial<Record<ContactEditableField, string | null>> = {};
    for (const def of fields) {
      const initial = initialOf(def, contact).trim();
      const current = (draft[def.field] ?? "").trim();
      if (current !== initial) {
        changes[def.field] = current === "" ? null : current;
      }
    }
    onSaveAll(changes);
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-col items-center gap-2 border-b border-slate-100 px-4 py-5 text-center">
        <Avatar name={contact.full_name} size={64} />
        <h2 className="text-base font-bold text-slate-900">
          {contact.full_name}
        </h2>
        {contact.job_title && (
          <p className="text-xs text-slate-500">{contact.job_title}</p>
        )}
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
          Sobre esse contato
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
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, [def.field]: e.target.value }))
                  }
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
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, [def.field]: e.target.value }))
                  }
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
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, [def.field]: e.target.value }))
                  }
                  className={inputClass}
                />
              )
            ) : (
              <div className="text-sm text-slate-800">
                {def.render
                  ? def.render(contact)
                  : valueOrDash(initialOf(def, contact))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
