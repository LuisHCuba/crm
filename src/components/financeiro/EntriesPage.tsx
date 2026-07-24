import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, CheckCircle2, Inbox, X } from "lucide-react";
import { toast } from "sonner";
import { gqlClient } from "../../lib/graphql";
import {
  PAYABLES_QUERY,
  RECEIVABLES_FIN_QUERY,
  ARCHIVE_PAYABLE,
  ARCHIVE_RECEIVABLE,
  type Payable,
  type Receivable,
} from "../../lib/queries/financeiro";
import { formatCurrency, formatDate } from "../../lib/format";
import { effectiveStatus, num, parseDate, toISODate } from "../../lib/financeiro-utils";
import { logActivity } from "../../lib/activity-log";
import { useFinReference } from "./hooks";
import { LancamentoForm } from "./LancamentoForm";
import { BaixaModal } from "./BaixaModal";
import { StatusBadge, MetricCard, Btn, EmptyState, inputCls } from "./ui";
import { SearchBox, FilterPill, ViewTabs } from "../crm/listview";
import { ErrorState, SkeletonRows } from "../crm/ui";

type Kind = "payable" | "receivable";

/* ------------------------------------------------------------------ */
/*  Presets de vencimento                                              */
/* ------------------------------------------------------------------ */

type DuePreset = "" | "month" | "lastMonth" | "next30" | "year" | "custom";

const DUE_PRESETS: { value: DuePreset; label: string }[] = [
  { value: "month", label: "Este mês" },
  { value: "lastMonth", label: "Mês passado" },
  { value: "next30", label: "Próximos 30 dias" },
  { value: "year", label: "Este ano" },
  { value: "custom", label: "Personalizado…" },
];

function presetRange(preset: DuePreset): { from: string; to: string } | null {
  const now = new Date();
  switch (preset) {
    case "month":
      return {
        from: toISODate(new Date(now.getFullYear(), now.getMonth(), 1)),
        to: toISODate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
      };
    case "lastMonth":
      return {
        from: toISODate(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        to: toISODate(new Date(now.getFullYear(), now.getMonth(), 0)),
      };
    case "next30": {
      const end = new Date(now);
      end.setDate(end.getDate() + 30);
      return { from: toISODate(now), to: toISODate(end) };
    }
    case "year":
      return {
        from: toISODate(new Date(now.getFullYear(), 0, 1)),
        to: toISODate(new Date(now.getFullYear(), 11, 31)),
      };
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Página de lançamentos (a pagar / a receber)                        */
/* ------------------------------------------------------------------ */

export function EntriesPage({ kind }: { kind: Kind }) {
  const isReceivable = kind === "receivable";
  const qc = useQueryClient();
  const ref = useFinReference();
  const queryKey = isReceivable ? "fin-receivables" : "fin-payables";

  const { data, isLoading, error, refetch: refetchQuery } = useQuery({
    queryKey: [queryKey],
    queryFn: () =>
      gqlClient.request<{ payables?: Payable[]; receivables?: Receivable[] }>(
        isReceivable ? RECEIVABLES_FIN_QUERY : PAYABLES_QUERY
      ),
  });

  const items: (Payable | Receivable)[] = useMemo(
    () => (isReceivable ? data?.receivables : data?.payables) ?? [],
    [data, isReceivable]
  );

  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [accountFilter, setAccountFilter] = useState("");
  const [duePreset, setDuePreset] = useState<DuePreset>("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Payable | Receivable | null>(null);
  const [baixa, setBaixa] = useState<Payable | Receivable | null>(null);

  // Foco em um lançamento específico (link vindo dos record pages do CRM).
  const [params] = useSearchParams();
  const focusId = params.get("focus");

  // Intervalo efetivo de vencimento (preset ou personalizado).
  const dueRange = useMemo(() => {
    if (duePreset === "custom") return from || to ? { from, to } : null;
    return presetRange(duePreset);
  }, [duePreset, from, to]);

  // Contagens por status (sobre TODOS os itens, para as abas).
  const statusCounts = useMemo(() => {
    const counts = { all: items.length, pending: 0, overdue: 0, paid: 0 };
    for (const it of items) {
      const eff = effectiveStatus(it.status, it.due_date);
      if (eff === "pending") counts.pending++;
      else if (eff === "overdue") counts.overdue++;
      else if (eff === "paid") counts.paid++;
    }
    return counts;
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((it) => {
      const eff = effectiveStatus(it.status, it.due_date);
      if (statusFilter !== "all" && eff !== statusFilter) return false;
      if (categoryFilter && it.category_id !== categoryFilter) return false;
      if (accountFilter && it.bank_account_id !== accountFilter) return false;
      if (dueRange) {
        const due = parseDate(it.due_date);
        if (dueRange.from && due && due < new Date(dueRange.from + "T00:00:00"))
          return false;
        if (dueRange.to && due && due > new Date(dueRange.to + "T23:59:59"))
          return false;
      }
      if (search) {
        const hay = `${it.description} ${
          isReceivable
            ? (it as Receivable).payer_name ?? ""
            : (it as Payable).supplier_name ?? ""
        }`.toLowerCase();
        if (!hay.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [items, statusFilter, categoryFilter, accountFilter, dueRange, search, isReceivable]);

  const totals = useMemo(() => {
    let pending = 0,
      overdue = 0,
      paid = 0;
    for (const it of filtered) {
      const eff = effectiveStatus(it.status, it.due_date);
      const paidVal = num(
        isReceivable
          ? (it as Receivable).received_value
          : (it as Payable).paid_value
      );
      if (eff === "paid") paid += paidVal || num(it.value);
      else if (eff === "overdue") overdue += num(it.value);
      else if (eff === "pending") pending += num(it.value);
    }
    return { pending, overdue, paid, openTotal: pending + overdue };
  }, [filtered, isReceivable]);

  const hasActiveFilters =
    statusFilter !== "all" ||
    !!categoryFilter ||
    !!accountFilter ||
    !!duePreset ||
    !!search;

  const clearFilters = () => {
    setStatusFilter("all");
    setCategoryFilter("");
    setAccountFilter("");
    setDuePreset("");
    setFrom("");
    setTo("");
    setSearch("");
  };

  const refetch = () => {
    qc.invalidateQueries({ queryKey: [queryKey] });
    qc.invalidateQueries({ queryKey: ["fin-overview"] });
    qc.invalidateQueries({ queryKey: ["fin-bank-accounts"] });
    qc.invalidateQueries({ queryKey: ["finance-links"] });
  };

  // Rola até o lançamento em foco quando os dados estiverem prontos.
  useEffect(() => {
    if (!focusId || filtered.length === 0) return;
    const el = document.getElementById(`fin-entry-${focusId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusId, filtered]);

  async function handleArchive(it: Payable | Receivable) {
    if (!confirm(`Excluir o lançamento "${it.description}"?`)) return;
    try {
      await gqlClient.request(isReceivable ? ARCHIVE_RECEIVABLE : ARCHIVE_PAYABLE, {
        id: it.id,
      });
      await logActivity({
        title: `Lançamento excluído: ${it.description}`,
        link: {
          dealId: it.deal_id ?? undefined,
          contactId: it.contact_id ?? undefined,
          companyId: it.company_id ?? undefined,
        },
      });
      toast.success("Lançamento excluído.");
      refetch();
    } catch {
      toast.error("Erro ao excluir.");
    }
  }

  const openEdit = (it: Payable | Receivable) => {
    setEditing(it);
    setFormOpen(true);
  };

  const accent = isReceivable ? "text-emerald-700" : "text-rose-700";
  const paidLabel = isReceivable ? "Recebido" : "Pago";

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            {isReceivable ? "Contas a receber" : "Contas a pagar"}
          </h2>
          <p className="text-sm text-slate-500">
            {filtered.length === items.length
              ? `${items.length} lançamento(s)`
              : `${filtered.length} de ${items.length} lançamento(s)`}
          </p>
        </div>
        <Btn
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus size={16} /> Novo lançamento
        </Btn>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard
          label="Em aberto"
          value={formatCurrency(totals.openTotal)}
          accent="text-slate-900"
          sub="A vencer + vencido (no filtro atual)"
        />
        <MetricCard
          label="Vencido"
          value={formatCurrency(totals.overdue)}
          accent="text-red-600"
        />
        <MetricCard label={paidLabel} value={formatCurrency(totals.paid)} accent={accent} />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {/* Abas de status com contagem */}
        <ViewTabs
          tabs={[
            { id: "all", label: "Todos", count: statusCounts.all },
            { id: "pending", label: "A vencer", count: statusCounts.pending },
            { id: "overdue", label: "Vencidos", count: statusCounts.overdue },
            { id: "paid", label: paidLabel + "s", count: statusCounts.paid },
          ]}
          activeId={statusFilter}
          onSelect={setStatusFilter}
        />

        {/* Filtros em uma linha */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-3">
          <div className="w-full max-w-xs">
            <SearchBox
              value={search}
              onChange={setSearch}
              placeholder={
                isReceivable ? "Buscar descrição ou pagador…" : "Buscar descrição ou fornecedor…"
              }
            />
          </div>
          <FilterPill
            label="Categoria"
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={ref.categories
              .filter((c) => c.type === (isReceivable ? "revenue" : "expense"))
              .map((c) => ({ value: c.id, label: c.name }))}
          />
          <FilterPill
            label="Conta"
            value={accountFilter}
            onChange={setAccountFilter}
            options={ref.bankAccounts.map((b) => ({ value: b.id, label: b.name }))}
          />
          <FilterPill
            label="Vencimento"
            value={duePreset}
            onChange={(v) => setDuePreset(v as DuePreset)}
            options={DUE_PRESETS.map((p) => ({ value: p.value, label: p.label }))}
          />
          {duePreset === "custom" && (
            <>
              <input
                type="date"
                aria-label="Vencimento de"
                className={inputCls + " w-auto py-1.5"}
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
              <span className="text-sm text-slate-400">até</span>
              <input
                type="date"
                aria-label="Vencimento até"
                className={inputCls + " w-auto py-1.5"}
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </>
          )}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="ml-auto flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={14} /> Limpar filtros
            </button>
          )}
        </div>

        {isLoading && <SkeletonRows rows={8} />}
        {error && (
          <div className="p-4">
            <ErrorState
              label="Não foi possível carregar os lançamentos."
              onRetry={() => refetchQuery()}
            />
          </div>
        )}

        {data && filtered.length === 0 && (
          <div className="p-6">
            <EmptyState
              icon={Inbox}
              title={
                hasActiveFilters
                  ? "Nenhum lançamento com estes filtros"
                  : "Nenhum lançamento ainda"
              }
              description={
                hasActiveFilters
                  ? "Ajuste ou limpe os filtros para ver mais resultados."
                  : "Crie o primeiro lançamento para começar o controle."
              }
              action={
                hasActiveFilters ? (
                  <Btn variant="secondary" onClick={clearFilters}>
                    Limpar filtros
                  </Btn>
                ) : (
                  <Btn
                    onClick={() => {
                      setEditing(null);
                      setFormOpen(true);
                    }}
                  >
                    <Plus size={16} /> Novo lançamento
                  </Btn>
                )
              }
            />
          </div>
        )}

        {data && filtered.length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Descrição</th>
                <th className="px-5 py-3">{isReceivable ? "Pagador" : "Fornecedor"}</th>
                <th className="px-5 py-3">Categoria</th>
                <th className="px-5 py-3">Conta</th>
                <th className="px-5 py-3">Vencimento</th>
                <th className="px-5 py-3 text-right">Valor</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((it) => {
                const counterpart = isReceivable
                  ? (it as Receivable).payer_name
                  : (it as Payable).supplier_name;
                const eff = effectiveStatus(it.status, it.due_date);
                return (
                  <tr
                    key={it.id}
                    id={`fin-entry-${it.id}`}
                    onClick={() => openEdit(it)}
                    className={`cursor-pointer hover:bg-slate-50 ${
                      focusId === it.id
                        ? "bg-indigo-50/60 ring-2 ring-inset ring-indigo-400"
                        : ""
                    }`}
                  >
                    <td className="px-5 py-3">
                      <span className="font-medium text-slate-900">{it.description}</span>
                      {it.parcel_label && (
                        <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                          {it.parcel_label}
                        </span>
                      )}
                      {it.apportionments.length > 0 && (
                        <span className="ml-2 text-xs text-indigo-500">rateio</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-600">{counterpart || "—"}</td>
                    <td className="px-5 py-3 text-slate-600">{it.category?.name || "—"}</td>
                    <td className="px-5 py-3 text-slate-600">{it.bank_account?.name || "—"}</td>
                    <td className="px-5 py-3 text-slate-600">{formatDate(it.due_date)}</td>
                    <td
                      className="px-5 py-3 text-right font-semibold text-slate-900"
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {formatCurrency(it.value)}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={it.status} dueDate={it.due_date} />
                    </td>
                    <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {eff !== "paid" && eff !== "cancelled" && (
                          <button
                            onClick={() => setBaixa(it)}
                            title={isReceivable ? "Registrar recebimento" : "Registrar pagamento"}
                            aria-label={
                              isReceivable ? "Registrar recebimento" : "Registrar pagamento"
                            }
                            className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => openEdit(it)}
                          title="Editar"
                          aria-label="Editar"
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleArchive(it)}
                          title="Excluir"
                          aria-label="Excluir"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {formOpen && (
        <LancamentoForm
          kind={kind}
          open={formOpen}
          onClose={() => setFormOpen(false)}
          onSaved={refetch}
          editing={editing}
          refData={ref}
        />
      )}
      {baixa && (
        <BaixaModal
          kind={kind}
          entry={baixa}
          open={!!baixa}
          onClose={() => setBaixa(null)}
          onSaved={refetch}
          bankAccounts={ref.bankAccounts}
        />
      )}
    </div>
  );
}
