import type { FormDefinition } from "./queries/forms";

type Answers = Record<string, string | string[]>;

function asText(value: string | string[] | undefined): string {
  if (value === undefined) return "";
  return Array.isArray(value) ? value.join(", ") : value;
}

/** Resumo "Label: valor" para exibição de submissões. */
export function formatSubmissionSummary(
  definition: FormDefinition,
  answers: Answers
): string {
  const lines: string[] = [];
  for (const step of definition.steps) {
    for (const field of step.fields) {
      const value = asText(answers[field.id]).trim();
      if (value) lines.push(`${field.label}: ${value}`);
    }
  }
  return lines.join("\n");
}

export interface SubmissionAnswerRow {
  fieldId: string;
  label: string;
  value: string;
  stepTitle?: string;
}

/** Respostas estruturadas para painel de detalhe. */
export function submissionAnswerRows(
  definition: FormDefinition,
  answers: Answers
): SubmissionAnswerRow[] {
  const rows: SubmissionAnswerRow[] = [];
  for (const step of definition.steps) {
    for (const field of step.fields) {
      const value = asText(answers[field.id]).trim();
      if (value) {
        rows.push({
          fieldId: field.id,
          label: field.label,
          value,
          stepTitle: step.title || undefined,
        });
      }
    }
  }
  return rows;
}

export function countFormFields(definition: FormDefinition): number {
  return definition.steps.reduce((n, s) => n + s.fields.length, 0);
}

export function submissionPreview(
  definition: FormDefinition,
  answers: Answers,
  maxLen = 80
): string {
  const summary = formatSubmissionSummary(definition, answers).replace(/\n/g, " · ");
  if (summary.length <= maxLen) return summary || "—";
  return summary.slice(0, maxLen - 1) + "…";
}
