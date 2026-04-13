const currencyFmt = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatCurrency(value: string | number | null | undefined): string {
  if (value == null || value === "") return "R$ 0,00";
  return currencyFmt.format(typeof value === "string" ? Number(value) : value);
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("pt-BR");
}
