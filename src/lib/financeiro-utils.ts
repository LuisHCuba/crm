// Utilidades do módulo financeiro (status, vencimentos, recorrência, rateio).

export type LancamentoStatus = "pending" | "paid" | "overdue" | "cancelled";
export type Frequency =
  | "weekly"
  | "biweekly"
  | "monthly"
  | "bimonthly"
  | "quarterly"
  | "semiannual"
  | "yearly";

export const FREQUENCY_OPTIONS: { value: Frequency; label: string }[] = [
  { value: "weekly", label: "Semanal" },
  { value: "biweekly", label: "Quinzenal" },
  { value: "monthly", label: "Mensal" },
  { value: "bimonthly", label: "Bimestral" },
  { value: "quarterly", label: "Trimestral" },
  { value: "semiannual", label: "Semestral" },
  { value: "yearly", label: "Anual" },
];

export function frequencyLabel(f: string): string {
  return FREQUENCY_OPTIONS.find((o) => o.value === f)?.label ?? f;
}

export const STATUS_META: Record<
  LancamentoStatus,
  { label: string; cls: string; dot: string }
> = {
  paid: { label: "Pago", cls: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  pending: { label: "A vencer", cls: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  overdue: { label: "Vencido", cls: "bg-red-50 text-red-700", dot: "bg-red-500" },
  cancelled: { label: "Cancelado", cls: "bg-slate-100 text-slate-500", dot: "bg-slate-400" },
};

/** Início do dia local de hoje (para comparações de vencimento). */
export function today(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Converte "YYYY-MM-DD" em Date local sem deslocamento de fuso. */
export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Status "efetivo": um pendente com vencimento passado vira "vencido". */
export function effectiveStatus(
  status: string,
  dueDate: string | null | undefined
): LancamentoStatus {
  if (status === "paid" || status === "cancelled") return status as LancamentoStatus;
  const due = parseDate(dueDate);
  if (status === "pending" && due && due.getTime() < today().getTime()) return "overdue";
  return (status as LancamentoStatus) ?? "pending";
}

/** Dias até o vencimento (negativo = vencido há N dias). */
export function daysUntil(dueDate: string | null | undefined): number | null {
  const due = parseDate(dueDate);
  if (!due) return null;
  const ms = due.getTime() - today().getTime();
  return Math.round(ms / 86_400_000);
}

/** Próxima data a partir de uma data e frequência. */
export function nextDate(from: Date, freq: Frequency): Date {
  const d = new Date(from);
  switch (freq) {
    case "weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "biweekly":
      d.setDate(d.getDate() + 14);
      break;
    case "monthly":
      d.setMonth(d.getMonth() + 1);
      break;
    case "bimonthly":
      d.setMonth(d.getMonth() + 2);
      break;
    case "quarterly":
      d.setMonth(d.getMonth() + 3);
      break;
    case "semiannual":
      d.setMonth(d.getMonth() + 6);
      break;
    case "yearly":
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  return d;
}

export const num = (v: unknown): number => {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? (n as number) : 0;
};

/** Arredonda para 2 casas evitando erros de ponto flutuante. */
export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

export interface ApportionmentInput {
  category_id: string | null;
  cost_center_id: string | null;
  percentage: number | null;
  value: number;
}

/** Valida que o rateio soma o total (tolerância de 1 centavo). */
export function validateApportionment(
  items: ApportionmentInput[],
  total: number
): { ok: boolean; sum: number; message?: string } {
  if (items.length === 0) return { ok: true, sum: 0 };
  const sum = round2(items.reduce((s, i) => s + num(i.value), 0));
  if (items.some((i) => !i.category_id && !i.cost_center_id))
    return { ok: false, sum, message: "Cada linha do rateio precisa de categoria ou centro de custo." };
  if (Math.abs(sum - round2(total)) > 0.01)
    return {
      ok: false,
      sum,
      message: `A soma do rateio (${sum.toFixed(2)}) deve ser igual ao valor do lançamento (${round2(
        total
      ).toFixed(2)}).`,
    };
  return { ok: true, sum };
}
