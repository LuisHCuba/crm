import {
  emptyDefinition,
  type FieldType,
  type FormDefinition,
  type FormField,
  type FormStep,
  type MapTo,
} from "./queries/forms";
import {
  FORM_AI_PROMPT_MAX_CHARS,
  validateFormAiPrompt,
} from "./form-ai-limits";

export { FORM_AI_PROMPT_MAX_CHARS, validateFormAiPrompt };

const FIELD_TYPES: FieldType[] = [
  "text",
  "email",
  "phone",
  "textarea",
  "select",
  "radio",
  "number",
];

const MAP_TO_VALUES: MapTo[] = [
  "",
  "full_name",
  "email",
  "phone",
  "job_title",
];

export interface GeneratedForm {
  title: string;
  definition: FormDefinition;
}

function uuid(): string {
  return crypto.randomUUID();
}

function normalizeField(raw: unknown): FormField {
  const o = (raw ?? {}) as Record<string, unknown>;
  const type = FIELD_TYPES.includes(o.type as FieldType)
    ? (o.type as FieldType)
    : "text";
  const mapTo = MAP_TO_VALUES.includes(o.mapTo as MapTo)
    ? (o.mapTo as MapTo)
    : "";

  const options = Array.isArray(o.options)
    ? o.options.filter((x): x is string => typeof x === "string" && !!x.trim())
    : undefined;

  return {
    id: typeof o.id === "string" && o.id ? o.id : uuid(),
    type,
    label:
      typeof o.label === "string" && o.label.trim()
        ? o.label.trim()
        : "Pergunta",
    placeholder: typeof o.placeholder === "string" ? o.placeholder : "",
    required: !!o.required,
    options: options?.length ? options : undefined,
    mapTo,
  };
}

export function normalizeFormDefinition(raw: unknown): FormDefinition {
  const base = emptyDefinition();
  const root = (raw ?? {}) as Record<string, unknown>;
  const def = (root.definition ?? root) as Record<string, unknown>;

  const stepsRaw = Array.isArray(def.steps) ? def.steps : [];
  const steps: FormStep[] = [];

  for (const stepRaw of stepsRaw) {
    const step = (stepRaw ?? {}) as Record<string, unknown>;
    const fieldsRaw = Array.isArray(step.fields) ? step.fields : [];
    const fields = fieldsRaw.map(normalizeField).filter((f) => f.label);

    if (fields.length === 0) continue;

    steps.push({
      id: typeof step.id === "string" && step.id ? step.id : uuid(),
      title: typeof step.title === "string" ? step.title : undefined,
      fields,
    });
  }

  if (steps.length === 0) {
    throw new Error("A IA não retornou perguntas válidas.");
  }

  const thankYou = (def.thankYou ?? {}) as Record<string, unknown>;
  const theme = (def.theme ?? {}) as Record<string, unknown>;
  const settings = (def.settings ?? {}) as Record<string, unknown>;

  return {
    steps,
    thankYou: {
      title:
        typeof thankYou.title === "string" && thankYou.title
          ? thankYou.title
          : base.thankYou.title,
      message:
        typeof thankYou.message === "string" && thankYou.message
          ? thankYou.message
          : base.thankYou.message,
      buttonLabel:
        typeof thankYou.buttonLabel === "string" ? thankYou.buttonLabel : "",
      redirectUrl:
        typeof thankYou.redirectUrl === "string" ? thankYou.redirectUrl : "",
    },
    theme: {
      primary:
        typeof theme.primary === "string" && theme.primary
          ? theme.primary
          : base.theme.primary,
      background:
        typeof theme.background === "string" ? theme.background : "",
      logoUrl: typeof theme.logoUrl === "string" ? theme.logoUrl : "",
    },
    settings: {
      source:
        typeof settings.source === "string" && settings.source
          ? settings.source
          : "website",
      description:
        typeof settings.description === "string" ? settings.description : "",
    },
  };
}

function resolveWebhookUrl(): string | null {
  const configured = import.meta.env.VITE_N8N_FORM_WEBHOOK_URL?.trim();
  if (!configured) return null;

  if (configured.startsWith("http://") || configured.startsWith("https://")) {
    return configured;
  }

  const path = configured.startsWith("/") ? configured : `/${configured}`;
  return `/n8n${path}`;
}

function mockGenerate(prompt: string): Promise<GeneratedForm> {
  return new Promise((resolve) => {
    window.setTimeout(() => {
      const lower = prompt.toLowerCase();
      const firstLine = prompt.split("\n").find((l) => l.trim())?.trim() ?? "";
      const title =
        firstLine.length > 80 ? `${firstLine.slice(0, 77)}...` : firstLine ||
        "Formulário gerado";

      const fields: FormField[] = [
        {
          id: uuid(),
          type: "text",
          label: "Qual é o seu nome completo?",
          placeholder: "Ex: Maria Silva",
          required: true,
          mapTo: "full_name",
        },
        {
          id: uuid(),
          type: "email",
          label: "Qual é o seu e-mail?",
          placeholder: "seu@email.com",
          required: true,
          mapTo: "email",
        },
        {
          id: uuid(),
          type: "phone",
          label: "Qual é o seu telefone?",
          placeholder: "(11) 99999-9999",
          required: false,
          mapTo: "phone",
        },
      ];

      if (lower.includes("empresa") || lower.includes("cargo")) {
        fields.push({
          id: uuid(),
          type: "text",
          label: "Qual é o seu cargo?",
          required: false,
          mapTo: "job_title",
        });
      }

      if (
        lower.includes("serviço") ||
        lower.includes("servico") ||
        lower.includes("opção") ||
        lower.includes("opcao")
      ) {
        fields.push({
          id: uuid(),
          type: "radio",
          label: "Qual opção melhor descreve sua necessidade?",
          required: true,
          options: ["Opção A", "Opção B", "Outro"],
          mapTo: "",
        });
      } else {
        fields.push({
          id: uuid(),
          type: "textarea",
          label: "Conte mais sobre o que você precisa",
          placeholder: "Descreva com detalhes...",
          required: true,
          mapTo: "",
        });
      }

      const steps: FormStep[] = fields.map((field) => ({
        id: uuid(),
        title: "",
        fields: [field],
      }));

      resolve({
        title,
        definition: {
          ...emptyDefinition(),
          steps,
          thankYou: {
            title: "Obrigado!",
            message:
              "Recebemos suas informações e entraremos em contato em breve.",
            buttonLabel: "",
            redirectUrl: "",
          },
        },
      });
    }, 1200);
  });
}

export async function generateFormFromPrompt(
  prompt: string
): Promise<GeneratedForm> {
  const check = validateFormAiPrompt(prompt);
  if (!check.ok) {
    throw new Error(check.message);
  }
  const trimmed = prompt.trim();

  const webhookUrl = resolveWebhookUrl();
  if (!webhookUrl) {
    return mockGenerate(trimmed);
  }

  let res: Response;
  try {
    res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: trimmed }),
    });
  } catch {
    throw new Error(
      "Não foi possível contactar o n8n. Verifique VITE_N8N_BASE_URL e se o workflow está ativo."
    );
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      text.trim() || `Erro ao gerar formulário (HTTP ${res.status}).`
    );
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new Error("Resposta inválida do n8n (esperado JSON).");
  }

  const root = (data ?? {}) as Record<string, unknown>;
  const title =
    typeof root.title === "string" && root.title.trim()
      ? root.title.trim()
      : "Formulário gerado";

  return {
    title,
    definition: normalizeFormDefinition(data),
  };
}

export function isFormAiMockMode(): boolean {
  return !import.meta.env.VITE_N8N_FORM_WEBHOOK_URL?.trim();
}
