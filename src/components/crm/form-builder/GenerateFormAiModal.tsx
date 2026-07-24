import { useEffect, useState } from "react";
import {
  AlertCircle,
  Check,
  Loader2,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import {
  generateFormFromPrompt,
  FORM_AI_PROMPT_MAX_CHARS,
  isFormAiMockMode,
  validateFormAiPrompt,
  type GeneratedForm,
} from "../../../lib/form-ai";
import type { FormDefinition } from "../../../lib/queries/forms";
import { fieldInputClass } from "../ui";
import { Conversation } from "./Conversation";

type Step = "input" | "loading" | "preview" | "error";

export function GenerateFormAiModal({
  open,
  onClose,
  onAccept,
  replaceExisting = false,
}: {
  open: boolean;
  onClose: () => void;
  onAccept: (result: GeneratedForm) => void;
  /** Quando true, confirma substituição do formulário atual (FormBuilder). */
  replaceExisting?: boolean;
}) {
  const [step, setStep] = useState<Step>("input");
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<GeneratedForm | null>(null);
  const [editTitle, setEditTitle] = useState("");

  useEffect(() => {
    if (!open) {
      setStep("input");
      setPrompt("");
      setError("");
      setResult(null);
      setEditTitle("");
    }
  }, [open]);

  if (!open) return null;

  const mockMode = isFormAiMockMode();
  const charCount = prompt.length;
  const overLimit = charCount > FORM_AI_PROMPT_MAX_CHARS;

  const handleGenerate = async () => {
    const check = validateFormAiPrompt(prompt);
    if (!check.ok) {
      setError(check.message ?? "Prompt inválido.");
      setStep("error");
      return;
    }

    setStep("loading");
    setError("");
    try {
      const generated = await generateFormFromPrompt(prompt);
      setResult(generated);
      setEditTitle(generated.title);
      setStep("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao gerar formulário.");
      setStep("error");
    }
  };

  const handleAccept = () => {
    if (!result) return;
    if (
      replaceExisting &&
      !window.confirm(
        "Isso vai substituir todas as etapas atuais do formulário. Continuar?"
      )
    ) {
      return;
    }
    onAccept({ ...result, title: editTitle.trim() || result.title });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 py-8"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && step !== "loading") onClose();
      }}
    >
      <div
        className={`w-full rounded-2xl bg-white shadow-xl ${
          step === "preview" ? "max-w-5xl" : "max-w-2xl"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-indigo-600" />
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Gerar formulário com IA
              </h2>
              {mockMode && (
                <p className="text-xs text-amber-600">
                  Modo mock — configure VITE_N8N_FORM_WEBHOOK_URL para usar o n8n
                </p>
              )}
            </div>
          </div>
          {step !== "loading" && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              <X size={20} />
            </button>
          )}
        </div>

        <div className="p-6">
          {step === "input" && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Descreva o formulário que você quer: público-alvo, objetivo,
                perguntas desejadas, tom de voz. A IA monta as etapas no estilo
                conversacional do CRM.
              </p>
              <textarea
                rows={10}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  "Ex: Formulário de qualificação para clínica odontológica.\n" +
                  "Preciso captar nome, telefone, e-mail, qual tratamento interessa " +
                  "(limpeza, implante, ortodontia) e se já é paciente."
                }
                className={fieldInputClass}
                autoFocus
              />
              <div className="flex items-center justify-between gap-2">
                <p
                  className={`text-xs ${
                    overLimit ? "font-medium text-red-600" : "text-slate-400"
                  }`}
                >
                  {charCount.toLocaleString("pt-BR")} /{" "}
                  {FORM_AI_PROMPT_MAX_CHARS.toLocaleString("pt-BR")} caracteres
                </p>
                {overLimit && (
                  <p className="text-xs font-medium text-red-600">
                    Texto acima do limite — encurte antes de gerar
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || overLimit}
                  className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Sparkles size={16} /> Gerar formulário
                </button>
              </div>
            </div>
          )}

          {step === "loading" && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Loader2 size={36} className="animate-spin text-indigo-600" />
              <p className="mt-4 text-sm font-medium text-slate-700">
                A IA está montando as perguntas...
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Isso pode levar alguns segundos
              </p>
            </div>
          )}

          {step === "error" && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <AlertCircle size={20} className="mt-0.5 shrink-0" />
                <p>{error}</p>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={() => setStep("input")}
                  className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
                >
                  <RefreshCw size={16} /> Tentar de novo
                </button>
              </div>
            </div>
          )}

          {step === "preview" && result && (
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Título do formulário
                </label>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className={fieldInputClass}
                />
                <p className="mt-2 text-xs text-slate-500">
                  {result.definition.steps.length} etapa(s) ·{" "}
                  {result.definition.steps.reduce(
                    (n, s) => n + s.fields.length,
                    0
                  )}{" "}
                  pergunta(s)
                </p>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="border-b border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Pré-visualização
                </div>
                <div className="max-h-[420px] overflow-auto">
                  <Conversation
                    key={JSON.stringify(result.definition)}
                    definition={result.definition}
                  />
                </div>
              </div>

              <FieldSummary definition={result.definition} />

              <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setStep("input");
                    setResult(null);
                  }}
                  className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  <RefreshCw size={16} /> Gerar de novo
                </button>
                <button
                  type="button"
                  onClick={handleAccept}
                  className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
                >
                  <Check size={16} /> OK, usar este formulário
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FieldSummary({ definition }: { definition: FormDefinition }) {
  let n = 0;
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Perguntas geradas
      </p>
      <ol className="space-y-2 text-sm text-slate-700">
        {definition.steps.flatMap((step) =>
          step.fields.map((field) => {
            n += 1;
            const num = n;
            return (
              <li key={field.id} className="flex gap-2">
                <span className="font-medium text-slate-400">{num}.</span>
                <span>
                  {field.label}
                  {field.required && (
                    <span className="text-indigo-600"> *</span>
                  )}
                  <span className="ml-2 text-xs text-slate-400">
                    ({field.type})
                  </span>
                </span>
              </li>
            );
          })
        )}
      </ol>
    </div>
  );
}
