/** Limite alto de caracteres no prompt — validado no CRM antes de enviar. */
export const FORM_AI_PROMPT_MAX_CHARS = 150_000;

export function validateFormAiPrompt(prompt: string): {
  ok: boolean;
  length: number;
  message?: string;
} {
  const trimmed = prompt.trim();
  if (!trimmed) {
    return { ok: false, length: 0, message: "Descreva o formulário que você quer gerar." };
  }
  if (trimmed.length > FORM_AI_PROMPT_MAX_CHARS) {
    return {
      ok: false,
      length: trimmed.length,
      message: `Texto muito longo: ${trimmed.length.toLocaleString("pt-BR")} caracteres. Máximo: ${FORM_AI_PROMPT_MAX_CHARS.toLocaleString("pt-BR")}. Encurte o prompt antes de gerar.`,
    };
  }
  return { ok: true, length: trimmed.length };
}
