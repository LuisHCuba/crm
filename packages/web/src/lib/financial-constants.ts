export const STATUS_OPTIONS = [
  { value: "pending", label: "Pendente" },
  { value: "paid", label: "Pago" },
  { value: "overdue", label: "Vencido" },
  { value: "cancelled", label: "Cancelado" },
];

export const STATUS_FILTER_OPTIONS = [
  { value: "", label: "Todos" },
  ...STATUS_OPTIONS,
];

export const STATUS_VARIANT: Record<string, "warning" | "success" | "danger" | "neutral"> = {
  pending: "warning",
  paid: "success",
  overdue: "danger",
  cancelled: "neutral",
};

export const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  overdue: "Vencido",
  cancelled: "Cancelado",
};

export const RECURRENCE_OPTIONS = [
  { value: "none", label: "Sem recorrência" },
  { value: "monthly", label: "Mensal" },
  { value: "bimonthly", label: "Bimestral" },
  { value: "quarterly", label: "Trimestral" },
  { value: "semiannual", label: "Semestral" },
  { value: "annual", label: "Anual" },
];

export const RECURRENCE_MONTHS: Record<string, number> = {
  monthly: 1,
  bimonthly: 2,
  quarterly: 3,
  semiannual: 6,
  annual: 12,
};

export function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split("T")[0];
}
