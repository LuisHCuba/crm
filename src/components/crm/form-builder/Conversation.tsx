import { useMemo, useState, type CSSProperties, type KeyboardEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Send,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import type { FormDefinition, FormField } from "../../../lib/queries/forms";

type AnswerValue = string | string[];
type Answers = Record<string, AnswerValue>;

const FIELD_INPUT =
  "form-field-input w-full min-w-0 rounded-xl border-2 border-slate-200 bg-white px-4 py-3.5 text-base text-slate-900 outline-none transition placeholder:text-slate-400 sm:text-lg";

const FIELD_TEXTAREA =
  "form-field-textarea w-full min-w-0 resize-none rounded-xl border-2 border-slate-200 bg-white px-4 py-3.5 text-base leading-relaxed text-slate-900 outline-none transition placeholder:text-slate-400";

const FIELD_SELECT =
  "form-field-select w-full min-w-0 rounded-xl border-2 border-slate-200 bg-white px-4 py-3.5 text-base text-slate-900 outline-none transition sm:text-lg";

function shellBackground(primary: string, background?: string): string {
  const base = background?.trim() || "#eef2f7";
  return [
    `radial-gradient(ellipse 80% 50% at 50% 0%, color-mix(in srgb, ${primary} 18%, transparent) 0%, transparent 70%)`,
    `linear-gradient(180deg, ${base} 0%, color-mix(in srgb, ${primary} 5%, ${base}) 100%)`,
  ].join(", ");
}

function FieldControl({
  field,
  value,
  onChange,
  primary,
  enableAutoFocus,
  onEnter,
}: {
  field: FormField;
  value: AnswerValue | undefined;
  onChange: (value: AnswerValue) => void;
  primary: string;
  enableAutoFocus: boolean;
  onEnter?: () => void;
}) {
  const strValue = Array.isArray(value) ? value[0] ?? "" : value ?? "";

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && field.type !== "textarea" && onEnter) {
      e.preventDefault();
      onEnter();
    }
  };

  switch (field.type) {
    case "textarea":
      return (
        <textarea
          autoFocus={enableAutoFocus}
          rows={4}
          value={strValue}
          placeholder={field.placeholder || "Digite sua resposta..."}
          onChange={(e) => onChange(e.target.value)}
          className={FIELD_TEXTAREA}
        />
      );
    case "select":
      return (
        <select
          autoFocus={enableAutoFocus}
          value={strValue}
          onChange={(e) => onChange(e.target.value)}
          className={FIELD_SELECT}
        >
          <option value="">{field.placeholder || "Selecione uma opção..."}</option>
          {(field.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    case "radio":
      return (
        <div className="flex flex-col gap-2.5">
          {(field.options ?? []).map((opt) => {
            const checked = strValue === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange(opt)}
                className="flex w-full min-w-0 items-center gap-3 rounded-xl border-2 px-4 py-3.5 text-left text-base transition"
                style={{
                  borderColor: checked ? primary : "#e2e8f0",
                  backgroundColor: checked
                    ? `color-mix(in srgb, ${primary} 8%, white)`
                    : "white",
                }}
              >
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2"
                  style={{ borderColor: checked ? primary : "#94a3b8" }}
                >
                  {checked && (
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: primary }}
                    />
                  )}
                </span>
                <span className="min-w-0 font-medium text-slate-800">{opt}</span>
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
          autoFocus={enableAutoFocus}
          type={inputType}
          value={strValue}
          placeholder={field.placeholder || "Digite sua resposta..."}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className={FIELD_INPUT}
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
 */
export function Conversation({
  definition,
  title,
  onSubmit,
  enableAutoFocus = true,
  showBrandFooter = true,
  embedded = false,
}: {
  definition: FormDefinition;
  title?: string;
  onSubmit?: (answers: Answers) => Promise<void>;
  enableAutoFocus?: boolean;
  showBrandFooter?: boolean;
  /** Preview no editor — layout compacto, sem orbes nem altura de tela cheia. */
  embedded?: boolean;
}) {
  const steps = definition.steps ?? [];
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const primary = definition.theme?.primary || "#4f46e5";
  const background = definition.theme?.background || "";
  const logoUrl = definition.theme?.logoUrl || "";

  const total = steps.length;
  const current = steps[index];
  const isLast = index === total - 1;

  const progress = useMemo(() => {
    if (total === 0) return 0;
    if (done) return 100;
    return Math.round(((index + 1) / total) * 100);
  }, [index, total, done]);

  const themeStyle = {
    "--form-primary": primary,
    background: shellBackground(primary, background),
  } as CSSProperties;

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

  const panelClass =
    "w-full min-w-0 rounded-2xl bg-white shadow-lg ring-1 ring-slate-200/80";

  return (
    <div
      className={`form-public-root relative flex w-full max-w-full flex-col overflow-x-hidden ${
        embedded ? "min-h-[520px]" : "min-h-screen"
      }`}
      style={themeStyle}
    >
      {!embedded && (
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute left-1/2 top-0 h-64 w-[min(100%,28rem)] -translate-x-1/2 rounded-full opacity-30 blur-3xl"
            style={{ background: `color-mix(in srgb, ${primary} 40%, transparent)` }}
          />
        </div>
      )}

      <div className="relative z-10 h-1 w-full shrink-0 bg-black/[0.06]">
        <div
          className="h-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%`, backgroundColor: primary }}
        />
      </div>

      <div
        className={`relative z-10 mx-auto flex w-full min-w-0 max-w-lg flex-1 flex-col ${
          embedded ? "px-4 py-6" : "px-4 py-8 sm:px-6 sm:py-10"
        }`}
      >
        <header className="mb-6 shrink-0 text-center">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt=""
              className="mx-auto mb-4 h-12 max-w-full object-contain"
            />
          ) : (
            !embedded && (
              <div
                className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-md"
                style={{ backgroundColor: primary }}
              >
                <Sparkles size={20} />
              </div>
            )
          )}
          {title && (
            <p className="text-sm font-medium text-slate-600">{title}</p>
          )}
          {!done && total > 0 && (
            <p className="mt-1.5 text-xs font-medium text-slate-400">
              Etapa {Math.min(index + 1, total)} de {total}
            </p>
          )}
        </header>

        <main className="flex min-w-0 flex-1 flex-col justify-center">
          {done ? (
            <div
              key="done"
              className={`${panelClass} animate-[form-success-pop_.45s_ease-out] p-8 text-center sm:p-10`}
            >
              <div
                className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full"
                style={{
                  background: `color-mix(in srgb, ${primary} 12%, white)`,
                  color: primary,
                }}
              >
                <CheckCircle2 size={30} strokeWidth={2} />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {thankYou?.title || "Obrigado!"}
              </h1>
              <p className="mx-auto mt-3 max-w-sm whitespace-pre-line text-sm leading-relaxed text-slate-600 sm:text-base">
                {thankYou?.message || "Recebemos suas informações."}
              </p>
              {thankYou?.redirectUrl ? (
                <a
                  href={thankYou.redirectUrl}
                  className="mt-6 inline-flex items-center justify-center rounded-full px-7 py-2.5 text-sm font-semibold text-white transition hover:brightness-105"
                  style={{ backgroundColor: primary }}
                >
                  {thankYou.buttonLabel || "Continuar"}
                </a>
              ) : thankYou?.buttonLabel ? (
                <div
                  className="mt-6 inline-flex items-center justify-center rounded-full px-7 py-2.5 text-sm font-semibold text-white"
                  style={{ backgroundColor: primary }}
                >
                  {thankYou.buttonLabel}
                </div>
              ) : null}
            </div>
          ) : !current ? (
            <div className={`${panelClass} p-8 text-center text-slate-500`}>
              Este formulário ainda não possui etapas.
            </div>
          ) : (
            <div
              key={current.id}
              className={`${panelClass} animate-[form-step-in_.35s_ease-out]`}
            >
              <div className="space-y-6 p-6 sm:p-8">
                {current.title && (
                  <p
                    className="text-[11px] font-bold uppercase tracking-[0.12em]"
                    style={{ color: primary }}
                  >
                    {current.title}
                  </p>
                )}

                {current.fields.map((field) => (
                  <div key={field.id} className="min-w-0">
                    <label className="mb-2.5 block text-lg font-bold leading-snug text-slate-900 sm:text-xl">
                      {field.label}
                      {field.required && (
                        <span className="ml-0.5" style={{ color: primary }}>
                          *
                        </span>
                      )}
                    </label>
                    <FieldControl
                      field={field}
                      value={answers[field.id]}
                      onChange={(v) => setAnswer(field.id, v)}
                      primary={primary}
                      enableAutoFocus={enableAutoFocus}
                      onEnter={goNext}
                    />
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-6 py-4 sm:px-8">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={index === 0 || submitting}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <ArrowLeft size={16} /> Voltar
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-60 sm:px-6"
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
                      Continuar <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </main>

        {showBrandFooter && !embedded && (
          <footer className="mt-6 shrink-0 text-center">
            <p className="text-[11px] text-slate-400">
              Formulário seguro · Omn.ia by LHCX
            </p>
          </footer>
        )}
      </div>
    </div>
  );
}
