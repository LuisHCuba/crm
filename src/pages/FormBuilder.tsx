import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Link as LinkIcon,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { gqlClient } from "../lib/graphql";
import {
  FORM_BY_ID,
  UPDATE_FORM,
  type FieldType,
  type FormDefinition,
  type FormField,
  type FormRecord,
  type FormStep,
  type FormStatus,
  type MapTo,
} from "../lib/queries/forms";
import { PageHeader } from "../components/PageHeader";
import { ErrorState, Loading, fieldInputClass } from "../components/crm/ui";
import { Conversation } from "../components/crm/form-builder/Conversation";

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "text", label: "Texto" },
  { value: "email", label: "E-mail" },
  { value: "phone", label: "Telefone" },
  { value: "textarea", label: "Texto longo" },
  { value: "select", label: "Lista (select)" },
  { value: "radio", label: "Opções (radio)" },
  { value: "number", label: "Número" },
];

const MAP_OPTIONS: { value: MapTo; label: string }[] = [
  { value: "", label: "Não mapear (vira nota)" },
  { value: "full_name", label: "Nome completo" },
  { value: "email", label: "E-mail" },
  { value: "phone", label: "Telefone" },
  { value: "job_title", label: "Cargo" },
];

const labelClass = "mb-1 block text-xs font-medium text-slate-600";

function publicLink(id: string) {
  return `${window.location.origin}/f/${id}`;
}

function FieldEditor({
  field,
  onChange,
  onRemove,
}: {
  field: FormField;
  onChange: (next: FormField) => void;
  onRemove: () => void;
}) {
  const hasOptions = field.type === "select" || field.type === "radio";
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-start gap-2">
        <div className="flex-1 space-y-2">
          <div>
            <label className={labelClass}>Rótulo</label>
            <input
              value={field.label}
              onChange={(e) => onChange({ ...field, label: e.target.value })}
              className={fieldInputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Tipo</label>
              <select
                value={field.type}
                onChange={(e) =>
                  onChange({ ...field, type: e.target.value as FieldType })
                }
                className={fieldInputClass}
              >
                {FIELD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Mapear para</label>
              <select
                value={field.mapTo ?? ""}
                onChange={(e) =>
                  onChange({ ...field, mapTo: e.target.value as MapTo })
                }
                className={fieldInputClass}
              >
                {MAP_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Placeholder</label>
            <input
              value={field.placeholder ?? ""}
              onChange={(e) =>
                onChange({ ...field, placeholder: e.target.value })
              }
              className={fieldInputClass}
            />
          </div>
          {hasOptions && (
            <div>
              <label className={labelClass}>Opções (uma por linha)</label>
              <textarea
                rows={3}
                value={(field.options ?? []).join("\n")}
                onChange={(e) =>
                  onChange({
                    ...field,
                    options: e.target.value
                      .split("\n")
                      .map((o) => o.trim())
                      .filter(Boolean),
                  })
                }
                className={fieldInputClass}
              />
            </div>
          )}
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={!!field.required}
              onChange={(e) =>
                onChange({ ...field, required: e.target.checked })
              }
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Obrigatório
          </label>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
          title="Remover campo"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

function StepEditor({
  step,
  index,
  total,
  onChange,
  onRemove,
  onMove,
}: {
  step: FormStep;
  index: number;
  total: number;
  onChange: (next: FormStep) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const updateField = (fieldId: string, next: FormField) =>
    onChange({
      ...step,
      fields: step.fields.map((f) => (f.id === fieldId ? next : f)),
    });

  const removeField = (fieldId: string) =>
    onChange({ ...step, fields: step.fields.filter((f) => f.id !== fieldId) });

  const addField = () =>
    onChange({
      ...step,
      fields: [
        ...step.fields,
        {
          id: crypto.randomUUID(),
          type: "text",
          label: "Nova pergunta",
          required: false,
          mapTo: "",
        },
      ],
    });

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
          {index + 1}
        </span>
        <input
          value={step.title ?? ""}
          placeholder="Título da etapa (opcional)"
          onChange={(e) => onChange({ ...step, title: e.target.value })}
          className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-indigo-500"
        />
        <button
          type="button"
          onClick={() => onMove(-1)}
          disabled={index === 0}
          className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 disabled:opacity-30"
          title="Mover para cima"
        >
          <ChevronUp size={16} />
        </button>
        <button
          type="button"
          onClick={() => onMove(1)}
          disabled={index === total - 1}
          className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 disabled:opacity-30"
          title="Mover para baixo"
        >
          <ChevronDown size={16} />
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
          title="Remover etapa"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="space-y-2">
        {step.fields.map((field) => (
          <FieldEditor
            key={field.id}
            field={field}
            onChange={(next) => updateField(field.id, next)}
            onRemove={() => removeField(field.id)}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={addField}
        className="mt-3 flex items-center gap-1.5 text-sm font-medium text-indigo-600 transition hover:text-indigo-700"
      >
        <Plus size={15} /> Adicionar campo
      </button>
    </div>
  );
}

export default function FormBuilder() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<FormStatus>("draft");
  const [definition, setDefinition] = useState<FormDefinition | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["form", id],
    queryFn: () =>
      gqlClient.request<{ forms_by_pk: FormRecord | null }>(FORM_BY_ID, { id }),
    enabled: !!id,
  });

  useEffect(() => {
    const form = data?.forms_by_pk;
    if (form) {
      setTitle(form.title);
      setStatus(form.status);
      setDefinition(form.definition);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      gqlClient.request(UPDATE_FORM, {
        id,
        set: { title, status, definition, updated_at: new Date().toISOString() },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forms"] });
      queryClient.invalidateQueries({ queryKey: ["form", id] });
      toast.success("Formulário salvo");
    },
    onError: () => toast.error("Erro ao salvar formulário"),
  });

  const copyLink = async () => {
    if (!id) return;
    try {
      await navigator.clipboard.writeText(publicLink(id));
      toast.success("Link público copiado");
    } catch {
      toast.error("Não foi possível copiar o link");
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <Loading />
      </div>
    );
  }

  if (error || !data?.forms_by_pk || !definition) {
    return (
      <div className="p-8">
        <ErrorState label="Formulário não encontrado." />
        <Link
          to="/formularios"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600"
        >
          <ArrowLeft size={16} /> Voltar
        </Link>
      </div>
    );
  }

  const updateStep = (stepId: string, next: FormStep) =>
    setDefinition((d) =>
      d
        ? { ...d, steps: d.steps.map((s) => (s.id === stepId ? next : s)) }
        : d
    );

  const removeStep = (stepId: string) =>
    setDefinition((d) =>
      d ? { ...d, steps: d.steps.filter((s) => s.id !== stepId) } : d
    );

  const moveStep = (index: number, dir: -1 | 1) =>
    setDefinition((d) => {
      if (!d) return d;
      const target = index + dir;
      if (target < 0 || target >= d.steps.length) return d;
      const steps = [...d.steps];
      [steps[index], steps[target]] = [steps[target], steps[index]];
      return { ...d, steps };
    });

  const addStep = () =>
    setDefinition((d) =>
      d
        ? {
            ...d,
            steps: [
              ...d.steps,
              {
                id: crypto.randomUUID(),
                title: "",
                fields: [
                  {
                    id: crypto.randomUUID(),
                    type: "text",
                    label: "Nova pergunta",
                    required: false,
                    mapTo: "",
                  },
                ],
              },
            ],
          }
        : d
    );

  const patchThankYou = (patch: Partial<FormDefinition["thankYou"]>) =>
    setDefinition((d) =>
      d ? { ...d, thankYou: { ...d.thankYou, ...patch } } : d
    );

  const patchTheme = (patch: Partial<FormDefinition["theme"]>) =>
    setDefinition((d) => (d ? { ...d, theme: { ...d.theme, ...patch } } : d));

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Editar formulário"
        subtitle="Construa um fluxo conversacional estilo Typebot"
        action={
          <div className="flex items-center gap-2">
            <Link
              to="/formularios"
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <ArrowLeft size={16} /> Voltar
            </Link>
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <LinkIcon size={16} /> Link público
            </button>
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {saveMutation.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              Salvar
            </button>
          </div>
        }
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 lg:grid-cols-2">
        {/* EDITOR */}
        <div className="min-h-0 overflow-auto border-r border-slate-200 p-6">
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Título do formulário</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={fieldInputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as FormStatus)}
                    className={fieldInputClass}
                  >
                    <option value="draft">Rascunho</option>
                    <option value="published">Publicado</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Etapas
              </h3>
              <div className="space-y-3">
                {definition.steps.map((step, i) => (
                  <StepEditor
                    key={step.id}
                    step={step}
                    index={i}
                    total={definition.steps.length}
                    onChange={(next) => updateStep(step.id, next)}
                    onRemove={() => removeStep(step.id)}
                    onMove={(dir) => moveStep(i, dir)}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={addStep}
                className="mt-3 flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-indigo-400 hover:text-indigo-600"
              >
                <Plus size={16} /> Adicionar etapa
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Tela de agradecimento
              </h3>
              <div className="space-y-3">
                <div>
                  <label className={labelClass}>Título</label>
                  <input
                    value={definition.thankYou.title}
                    onChange={(e) => patchThankYou({ title: e.target.value })}
                    className={fieldInputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Mensagem</label>
                  <textarea
                    rows={2}
                    value={definition.thankYou.message}
                    onChange={(e) => patchThankYou({ message: e.target.value })}
                    className={fieldInputClass}
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Label do botão (opcional)</label>
                    <input
                      value={definition.thankYou.buttonLabel ?? ""}
                      onChange={(e) =>
                        patchThankYou({ buttonLabel: e.target.value })
                      }
                      className={fieldInputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>
                      URL de redirecionamento (opcional)
                    </label>
                    <input
                      value={definition.thankYou.redirectUrl ?? ""}
                      onChange={(e) =>
                        patchThankYou({ redirectUrl: e.target.value })
                      }
                      placeholder="https://..."
                      className={fieldInputClass}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Tema
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-medium text-slate-600">
                    Cor primária
                  </label>
                  <input
                    type="color"
                    value={definition.theme.primary || "#4f46e5"}
                    onChange={(e) => patchTheme({ primary: e.target.value })}
                    className="h-8 w-12 cursor-pointer rounded border border-slate-300"
                  />
                  <label className="ml-4 text-xs font-medium text-slate-600">
                    Cor de fundo
                  </label>
                  <input
                    type="color"
                    value={definition.theme.background || "#f1f5f9"}
                    onChange={(e) => patchTheme({ background: e.target.value })}
                    className="h-8 w-12 cursor-pointer rounded border border-slate-300"
                  />
                </div>
                <div>
                  <label className={labelClass}>URL do logo (opcional)</label>
                  <input
                    value={definition.theme.logoUrl ?? ""}
                    onChange={(e) => patchTheme({ logoUrl: e.target.value })}
                    placeholder="https://..."
                    className={fieldInputClass}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PREVIEW */}
        <div className="min-h-0 overflow-auto bg-slate-100">
          <div className="border-b border-slate-200 bg-white px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Pré-visualização ao vivo
          </div>
          <Conversation key={JSON.stringify(definition)} definition={definition} />
        </div>
      </div>
    </div>
  );
}
