import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import type { FormDefinition, FormField } from "../../../lib/queries/forms";
import { fieldInputClass } from "../ui";

type AnswerValue = string | string[];
type Answers = Record<string, AnswerValue>;

function FieldControl({
  field,
  value,
  onChange,
  primary,
}: {
  field: FormField;
  value: AnswerValue | undefined;
  onChange: (value: AnswerValue) => void;
  primary: string;
}) {
  const strValue = Array.isArray(value) ? value[0] ?? "" : value ?? "";

  switch (field.type) {
    case "textarea":
      return (
        <textarea
          autoFocus
          rows={4}
          value={strValue}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={fieldInputClass}
        />
      );
    case "select":
      return (
        <select
          autoFocus
          value={strValue}
          onChange={(e) => onChange(e.target.value)}
          className={fieldInputClass}
        >
          <option value="">{field.placeholder || "Selecione..."}</option>
          {(field.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    case "radio":
      return (
        <div className="flex flex-col gap-2">
          {(field.options ?? []).map((opt) => {
            const checked = strValue === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange(opt)}
                className="flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition"
                style={{
                  borderColor: checked ? primary : "#cbd5e1",
                  backgroundColor: checked ? `${primary}14` : "white",
                }}
              >
                <span
                  className="flex h-4 w-4 items-center justify-center rounded-full border"
                  style={{ borderColor: checked ? primary : "#94a3b8" }}
                >
                  {checked && (
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: primary }}
                    />
                  )}
                </span>
                {opt}
              </button>
            );
          })}
        </div>
      );
    default: {
      const inputType =
        field.type === "email"
          ? "email"
          : field.type === "phone"
          ? "tel"
          : field.type === "number"
          ? "number"
          : "text";
      return (
        <input
          autoFocus
          type={inputType}
          value={strValue}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={fieldInputClass}
        />
      );
    }
  }
}

function isFilled(value: AnswerValue | undefined): boolean {
  if (value === undefined) return false;
  if (Array.isArray(value)) return value.length > 0 && value.some((v) => v.trim());
  return value.trim().length > 0;
}

/**
 * Renderer conversacional estilo Typebot: uma etapa por tela, barra de
 * progresso, botões Voltar/Avançar e tela de agradecimento ao final.
 *
 * `onSubmit` é opcional para permitir um preview "morto" no builder.
 */
export function Conversation({
  definition,
  onSubmit,
}: {
  definition: FormDefinition;
  onSubmit?: (answers: Answers) => Promise<void>;
}) {
  const steps = definition.steps ?? [];
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const primary = definition.theme?.primary || "#4f46e5";
  const background = definition.theme?.background || "#f1f5f9";
  const logoUrl = definition.theme?.logoUrl || "";

  const total = steps.length;
  const current = steps[index];
  const isLast = index === total - 1;

  const progress = useMemo(() => {
    if (total === 0) return 0;
    if (done) return 100;
    return Math.round((index / total) * 100);
  }, [index, total, done]);

  const setAnswer = (fieldId: string, value: AnswerValue) =>
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));

  const validateCurrent = (): boolean => {
    if (!current) return true;
    for (const field of current.fields) {
      if (field.required && !isFilled(answers[field.id])) {
        toast.error(`Preencha: ${field.label}`);
        return false;
      }
    }
    return true;
  };

  const goNext = async () => {
    if (!validateCurrent()) return;
    if (!isLast) {
      setIndex((i) => i + 1);
      return;
    }
    // Última etapa: enviar.
    if (!onSubmit) {
      setDone(true);
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(answers);
      setDone(true);
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível enviar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const goBack = () => setIndex((i) => Math.max(0, i - 1));

  const thankYou = definition.thankYou;

  return (
    <div
      className="flex min-h-full w-full flex-col items-center"
      style={{ backgroundColor: background }}
    >
      {/* Barra de progresso */}
      <div className="h-1.5 w-full bg-black/5">
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${progress}%`, backgroundColor: primary }}
        />
      </div>

      <div className="flex w-full max-w-xl flex-1 flex-col justify-center px-6 py-10">
        {logoUrl && (
          <img
            src={logoUrl}
            alt=""
            className="mx-auto mb-8 h-12 object-contain"
          />
        )}

        {done ? (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900">
              {thankYou?.title || "Obrigado!"}
            </h1>
            <p className="mt-3 whitespace-pre-line text-slate-600">
              {thankYou?.message || "Recebemos suas informações."}
            </p>
            {thankYou?.redirectUrl ? (
              <a
                href={thankYou.redirectUrl}
                className="mt-6 inline-flex items-center justify-center rounded-lg px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                style={{ backgroundColor: primary }}
              >
                {thankYou.buttonLabel || "Continuar"}
              </a>
            ) : thankYou?.buttonLabel ? (
              <div
                className="mt-6 inline-flex items-center justify-center rounded-lg px-6 py-2.5 text-sm font-semibold text-white"
                style={{ backgroundColor: primary }}
              >
                {thankYou.buttonLabel}
              </div>
            ) : null}
          </div>
        ) : !current ? (
          <div className="rounded-2xl bg-white p-10 text-center text-slate-500 shadow-sm">
            Este formulário ainda não possui etapas.
          </div>
        ) : (
          <div className="rounded-2xl bg-white p-8 shadow-sm sm:p-10">
            {current.title && (
              <p className="mb-6 text-sm font-medium uppercase tracking-wide text-slate-400">
                {current.title}
              </p>
            )}
            <div className="flex flex-col gap-6">
              {current.fields.map((field) => (
                <div key={field.id}>
                  <label className="mb-2 block text-lg font-semibold text-slate-900">
                    {field.label}
                    {field.required && (
                      <span style={{ color: primary }}> *</span>
                    )}
                  </label>
                  <FieldControl
                    field={field}
                    value={answers[field.id]}
                    onChange={(v) => setAnswer(field.id, v)}
                    primary={primary}
                  />
                </div>
              ))}
            </div>

            <div className="mt-8 flex items-center justify-between">
              <button
                type="button"
                onClick={goBack}
                disabled={index === 0 || submitting}
                className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 disabled:opacity-40"
              >
                <ArrowLeft size={16} /> Voltar
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={submitting}
                className="flex items-center gap-1.5 rounded-lg px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: primary }}
              >
                {submitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : isLast ? (
                  <>
                    <Send size={16} /> Enviar
                  </>
                ) : (
                  <>
                    Avançar <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
