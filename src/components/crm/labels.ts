import type {
  ActivityType,
  CompanyType,
  ContactOrigin,
  ContactStage,
  DealLossReason,
  StageType,
} from "../../lib/queries/crm";

export const CONTACT_STAGE_LABELS: Record<ContactStage, string> = {
  new: "Novo",
  qualified: "Qualificado",
  active_client: "Cliente ativo",
  inactive: "Inativo",
};

export const CONTACT_STAGE_STYLES: Record<ContactStage, string> = {
  new: "bg-sky-50 text-sky-700",
  qualified: "bg-amber-50 text-amber-700",
  active_client: "bg-emerald-50 text-emerald-700",
  inactive: "bg-slate-100 text-slate-500",
};

export const CONTACT_ORIGIN_LABELS: Record<ContactOrigin, string> = {
  website: "Site",
  referral: "Indicação",
  event: "Evento",
  other: "Outro",
};

export const COMPANY_TYPE_LABELS: Record<CompanyType, string> = {
  client: "Cliente",
  supplier: "Fornecedor",
  both: "Ambos",
};

export const COMPANY_TYPE_STYLES: Record<CompanyType, string> = {
  client: "bg-emerald-50 text-emerald-700",
  supplier: "bg-violet-50 text-violet-700",
  both: "bg-indigo-50 text-indigo-700",
};

export const LOSS_REASON_LABELS: Record<DealLossReason, string> = {
  price: "Preço",
  competition: "Concorrência",
  timing: "Timing",
  no_response: "Sem resposta",
  other: "Outro",
};

export const STAGE_TYPE_STYLES: Record<StageType, string> = {
  open: "bg-blue-50 text-blue-700",
  won: "bg-emerald-50 text-emerald-700",
  lost: "bg-red-50 text-red-700",
};

export const STAGE_TYPE_DOT: Record<StageType, string> = {
  open: "bg-blue-500",
  won: "bg-emerald-500",
  lost: "bg-red-500",
};

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  note: "Nota",
  call: "Ligação",
  meeting: "Reunião",
  email: "E-mail",
  reminder: "Lembrete",
  system: "Sistema",
};

export const CALL_RESULT_LABELS: Record<string, string> = {
  answered: "Atendida",
  no_answer: "Não atendeu",
  voicemail: "Caixa postal",
};

/** Formata contagens grandes de forma compacta (ex.: 96000 -> "96 mil"). */
export function formatCount(n: number): string {
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    return `${v.toFixed(v % 1 === 0 ? 0 : 1).replace(".", ",")} mi`;
  }
  if (n >= 1000) {
    const v = n / 1000;
    return `${v.toFixed(v % 1 === 0 ? 0 : 1).replace(".", ",")} mil`;
  }
  return String(n);
}

export function initials(name: string | null | undefined): string {
  return (name || "?")
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Calcula o subtotal de um item de linha. */
export function computeSubtotal(
  quantity: number,
  unitPrice: number,
  discountPercent: number
): number {
  const gross = quantity * unitPrice;
  const discounted = gross * (1 - (discountPercent || 0) / 100);
  return Math.round(discounted * 100) / 100;
}
