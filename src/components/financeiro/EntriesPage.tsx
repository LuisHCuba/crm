import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Search,
  Inbox,
} from "lucide-react";
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
import { effectiveStatus, num, parseDate } from "../../lib/financeiro-utils";
import { logActivity } from "../../lib/activity-log";
import { useFinReference } from "./hooks";
import { LancamentoForm } from "./LancamentoForm";
import { BaixaModal } from "./BaixaModal";
import { StatusBadge, MetricCard, Btn, EmptyState, inputCls } from "./ui";

type Kind = "payable" | "receivable";

export function EntriesPage({ kind }: { kind: Kind }) {
  const isReceivable = kind === "receivable";
  const qc = useQueryClient();
  const ref = useFinReference();
  const queryKey = isReceivable ? "fin-receivables" : "fin-payables";

  const { data, isLoading, error } = useQuery({
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
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Payable | Receivable | null>(null);
  const [baixa, setBaixa] = useState<Payable | Receivable | null>(null);

  // Foco em um lançamento específico (link vindo dos record pages do CRM).
  const [params] = useSearchParams();
  const focusId = params.get("focus");

  const filtered = useMemo(() => {
    return items.filter((it) => {
      const eff = effectiveStatus(it.status, it.due_date);
      if (statusFilter !== "all" && eff !== statusFilter) return false;
      if (categoryFilter && it.category_id !== categoryFilter) return false;
      if (accountFilter && it.bank_account_id !== accountFilter) return false;
      const due = parseDate(it.due_date);
      if (from && due && due < new Date(from + "T00:00:00")) return false;
      if (to && due && due > new Date(to + "T00:00:00")) return false;
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
  }, [items, statusFilter, categoryFilter, accountFilter, from, to, search, isReceivable]);

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

  const accent = isReceivable ? "text-emerald-600" : "text-rose-600";

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            {isReceivable ? "Contas a receber" : "Contas a pagar"}
          </h2>
          <p className="text-sm text-slate-500">
            {items.length} lançamentos · {filtered.length} no filtro atual
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

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard
          label="Em aberto"
          value={formatCurrency(totals.openTotal)}
          accent="text-slate-900"
          sub="A vencer + vencido"
        />
        <MetricCard
          label="Vencido"
          value={formatCurrency(totals.overdue)}
          accent="text-red-600"
        />
        <MetricCard
          label={isReceivable ? "Recebido" : "Pago"}
          value={formatCurrency(totals.paid)}
          accent={accent}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            className={inputCls + " pl-9"}
            placeholder="Buscar descrição ou parte…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className={inputCls + " w-auto"}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">Todos os status</option>
          <option value="pending">A vencer</option>
          <option value="overdue">Vencido</option>
          <option value="paid">{isReceivable ? "Recebido" : "Pago"}</option>
          <option value="cancelled">Cancelado</option>
        </select>
        <select
          className={inputCls + " w-auto"}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">Todas categorias</option>
          {ref.categories
            .filter((c) => c.type === (isReceivable ? "revenue" : "expense"))
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </select>
        <select
          className={inputCls + " w-auto"}
          value={accountFilter}
          onChange={(e) => setAccountFilter(e.target.value)}
        >
          <option value="">Todas as contas</option>
          {ref.bankAccounts.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          className={inputCls + " w-auto"}
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          title="Vencimento de"
        />
        <input
          type="date"
          className={inputCls + " w-auto"}
          value={to}
          onChange={(e) => setTo(e.target.value)}
          title="Vencimento até"
        />
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-slate-500">
          <Loader2 className="animate-spin" size={18} /> Carregando…
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          Erro ao carregar lançamentos.
        </div>
      )}

      {data && filtered.length === 0 && (
        <EmptyState
          icon={Inbox}
          title="Nenhum lançamento encontrado"
          description="Ajuste os filtros ou crie um novo lançamento."
        />
      )}

      {data && filtered.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
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
                    className={`hover:bg-slate-50 ${
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
                    <td className="px-5 py-3 text-right font-semibold text-slate-900">
                      {formatCurrency(it.value)}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={it.status} dueDate={it.due_date} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {eff !== "paid" && eff !== "cancelled" && (
                          <button
                            onClick={() => setBaixa(it)}
                            title={isReceivable ? "Receber" : "Pagar"}
                            className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setEditing(it);
                            setFormOpen(true);
                          }}
                          title="Editar"
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleArchive(it)}
                          title="Excluir"
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
        </div>
      )}

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
