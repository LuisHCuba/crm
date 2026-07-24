import type { BankTransaction, Payable, Receivable } from "./queries/financeiro";
import { effectiveStatus, num, parseDate, toISODate, today } from "./financeiro-utils";

export type TimelinePeriod = "3m" | "6m" | "12m" | "ytd" | "24m";
export type TimelineView = "cash" | "forecast" | "combined";

export interface TimelineEvent {
  id: string;
  date: string;
  direction: "in" | "out";
  source: "bank" | "payable" | "receivable";
  description: string;
  amount: number;
  status: "realized" | "forecast";
  account?: string;
  category?: string;
}

export interface MonthBucket {
  key: string;
  label: string;
  inflow: number;
  outflow: number;
  net: number;
  cumulative: number;
  forecastIn: number;
  forecastOut: number;
  events: TimelineEvent[];
}

export interface CategorySlice {
  name: string;
  type: "in" | "out";
  value: number;
  pct: number;
}

export interface TimelineReportData {
  from: string;
  to: string;
  months: MonthBucket[];
  events: TimelineEvent[];
  openingBalance: number;
  closingBalance: number;
  totalIn: number;
  totalOut: number;
  totalNet: number;
  forecastIn: number;
  forecastOut: number;
  categoriesIn: CategorySlice[];
  categoriesOut: CategorySlice[];
  bestMonth: MonthBucket | null;
  worstMonth: MonthBucket | null;
}

const MONTH_NAMES = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

export function periodRange(preset: TimelinePeriod): { from: string; to: string } {
  const end = today();
  const start = new Date(end);

  switch (preset) {
    case "3m":
      start.setMonth(start.getMonth() - 2);
      start.setDate(1);
      break;
    case "6m":
      start.setMonth(start.getMonth() - 5);
      start.setDate(1);
      break;
    case "12m":
      start.setMonth(start.getMonth() - 11);
      start.setDate(1);
      break;
    case "24m":
      start.setMonth(start.getMonth() - 23);
      start.setDate(1);
      break;
    case "ytd":
      start.setMonth(0, 1);
      break;
  }

  return { from: toISODate(start), to: toISODate(end) };
}

export function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]}/${String(y).slice(2)}`;
}

function monthKeysBetween(from: string, to: string): string[] {
  const keys: string[] = [];
  const cur = parseDate(from);
  const end = parseDate(to);
  if (!cur || !end) return keys;
  cur.setDate(1);
  while (cur.getTime() <= end.getTime()) {
    keys.push(toISODate(cur).slice(0, 7));
    cur.setMonth(cur.getMonth() + 1);
  }
  return keys;
}

function inRange(dateStr: string | null | undefined, from: string, to: string): boolean {
  if (!dateStr) return false;
  return dateStr >= from && dateStr <= to;
}

function pushEvent(bucket: MonthBucket, ev: TimelineEvent) {
  bucket.events.push(ev);
  if (ev.status === "realized") {
    if (ev.direction === "in") bucket.inflow += ev.amount;
    else bucket.outflow += ev.amount;
  } else {
    if (ev.direction === "in") bucket.forecastIn += ev.amount;
    else bucket.forecastOut += ev.amount;
  }
  bucket.net = bucket.inflow - bucket.outflow;
}

function bankEvents(
  txs: BankTransaction[],
  from: string,
  to: string
): TimelineEvent[] {
  return txs
    .filter((t) => inRange(t.date, from, to) && !t.transfer_group)
    .map((t) => {
      const amount = num(t.amount);
      return {
        id: `bank-${t.id}`,
        date: t.date,
        direction: amount >= 0 ? "in" : "out",
        source: "bank" as const,
        description: t.description,
        amount: Math.abs(amount),
        status: "realized" as const,
        account: t.bank_account?.name,
      };
    });
}

function entryEvents(
  payables: Payable[],
  receivables: Receivable[],
  from: string,
  to: string,
  view: TimelineView
): TimelineEvent[] {
  const out: TimelineEvent[] = [];

  for (const p of payables) {
    if (p.status === "paid" && p.payment_date && inRange(p.payment_date, from, to)) {
      if (view === "cash") continue;
      out.push({
        id: `pay-paid-${p.id}`,
        date: p.payment_date,
        direction: "out",
        source: "payable",
        description: p.description,
        amount: num(p.paid_value ?? p.value),
        status: "realized",
        category: p.category?.name,
      });
    } else if (
      (view === "forecast" || view === "combined") &&
      effectiveStatus(p.status, p.due_date) !== "paid" &&
      effectiveStatus(p.status, p.due_date) !== "cancelled" &&
      inRange(p.due_date, from, to)
    ) {
      out.push({
        id: `pay-due-${p.id}`,
        date: p.due_date,
        direction: "out",
        source: "payable",
        description: p.description,
        amount: num(p.value),
        status: "forecast",
        category: p.category?.name,
      });
    }
  }

  for (const r of receivables) {
    if (r.status === "paid" && r.payment_date && inRange(r.payment_date, from, to)) {
      if (view === "cash") continue;
      out.push({
        id: `rec-paid-${r.id}`,
        date: r.payment_date,
        direction: "in",
        source: "receivable",
        description: r.description,
        amount: num(r.received_value ?? r.value),
        status: "realized",
        category: r.category?.name,
      });
    } else if (
      (view === "forecast" || view === "combined") &&
      effectiveStatus(r.status, r.due_date) !== "paid" &&
      effectiveStatus(r.status, r.due_date) !== "cancelled" &&
      inRange(r.due_date, from, to)
    ) {
      out.push({
        id: `rec-due-${r.id}`,
        date: r.due_date,
        direction: "in",
        source: "receivable",
        description: r.description,
        amount: num(r.value),
        status: "forecast",
        category: r.category?.name,
      });
    }
  }

  return out;
}

function buildCategorySlices(events: TimelineEvent[], direction: "in" | "out"): CategorySlice[] {
  const map = new Map<string, number>();
  for (const e of events) {
    if (e.direction !== direction) continue;
    const name = e.category?.trim() || (e.source === "bank" ? "Movimentação bancária" : "Sem categoria");
    map.set(name, (map.get(name) ?? 0) + e.amount);
  }
  const total = [...map.values()].reduce((s, v) => s + v, 0) || 1;
  return [...map.entries()]
    .map(([name, value]) => ({
      name,
      type: direction,
      value,
      pct: (value / total) * 100,
    }))
    .sort((a, b) => b.value - a.value);
}

export function buildTimelineReport(input: {
  from: string;
  to: string;
  view: TimelineView;
  bankTx: BankTransaction[];
  payables: Payable[];
  receivables: Receivable[];
  banksBalance: number;
  bankTxInPeriodSum: number;
}): TimelineReportData {
  const { from, to, view, bankTx, payables, receivables, banksBalance, bankTxInPeriodSum } =
    input;

  const keys = monthKeysBetween(from, to);
  const monthMap = new Map<string, MonthBucket>();
  for (const key of keys) {
    monthMap.set(key, {
      key,
      label: monthLabel(key),
      inflow: 0,
      outflow: 0,
      net: 0,
      cumulative: 0,
      forecastIn: 0,
      forecastOut: 0,
      events: [],
    });
  }

  let events: TimelineEvent[] = [];
  if (view === "cash" || view === "combined") {
    events = events.concat(bankEvents(bankTx, from, to));
  }
  if (view === "forecast" || view === "combined") {
    events = events.concat(entryEvents(payables, receivables, from, to, view));
  } else if (view === "cash") {
    // só caixa
  }

  events.sort((a, b) => b.date.localeCompare(a.date) || b.amount - a.amount);

  for (const ev of events) {
    const key = monthKey(ev.date);
    const bucket = monthMap.get(key);
    if (bucket) pushEvent(bucket, ev);
  }

  const openingBalance = banksBalance - bankTxInPeriodSum;
  let cumulative = openingBalance;
  const months = keys.map((k) => {
    const b = monthMap.get(k)!;
    cumulative += b.inflow - b.outflow;
    b.cumulative = cumulative;
    b.events.sort((a, c) => c.date.localeCompare(a.date));
    return b;
  });

  const totalIn = months.reduce((s, m) => s + m.inflow, 0);
  const totalOut = months.reduce((s, m) => s + m.outflow, 0);
  const forecastIn = months.reduce((s, m) => s + m.forecastIn, 0);
  const forecastOut = months.reduce((s, m) => s + m.forecastOut, 0);

  const realizedMonths = months.filter((m) => m.inflow + m.outflow > 0);
  const bestMonth =
    realizedMonths.length > 0
      ? [...realizedMonths].sort((a, b) => b.net - a.net)[0]
      : null;
  const worstMonth =
    realizedMonths.length > 0
      ? [...realizedMonths].sort((a, b) => a.net - b.net)[0]
      : null;

  const catEvents = events.filter((e) => e.status === "realized" || view !== "cash");

  return {
    from,
    to,
    months,
    events,
    openingBalance,
    closingBalance: cumulative,
    totalIn,
    totalOut,
    totalNet: totalIn - totalOut,
    forecastIn,
    forecastOut,
    categoriesIn: buildCategorySlices(catEvents, "in"),
    categoriesOut: buildCategorySlices(catEvents, "out"),
    bestMonth,
    worstMonth,
  };
}

export const PERIOD_OPTIONS: { value: TimelinePeriod; label: string }[] = [
  { value: "3m", label: "3 meses" },
  { value: "6m", label: "6 meses" },
  { value: "12m", label: "12 meses" },
  { value: "ytd", label: "Ano atual" },
  { value: "24m", label: "24 meses" },
];

export const VIEW_OPTIONS: { value: TimelineView; label: string; hint: string }[] = [
  { value: "combined", label: "Completo", hint: "Caixa realizado + vencimentos previstos" },
  { value: "cash", label: "Caixa", hint: "Somente movimentações bancárias" },
  { value: "forecast", label: "Compromissos", hint: "Pagamentos e recebimentos por vencimento" },
];
