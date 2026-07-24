import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { gql } from "graphql-request";
import { Loader2, Scale, Link2, Upload, Check, Unlink, Search } from "lucide-react";
import { toast } from "sonner";
import { gqlClient } from "../../lib/graphql";
import {
  BANK_ACCOUNTS_QUERY,
  BANK_TRANSACTIONS_QUERY,
  PAYABLES_QUERY,
  RECEIVABLES_FIN_QUERY,
  UPDATE_BANK_TRANSACTION,
  INSERT_BANK_TRANSACTIONS,
  type BankTransaction,
  type Payable,
  type Receivable,
} from "../../lib/queries/financeiro";
import { ErrorState } from "../../components/crm/ui";

/*
 * Conciliação em par num ÚNICO documento GraphQL: o Hasura executa os dois
 * updates na mesma transação — ou concilia tudo, ou nada (evita extrato
 * conciliado com lançamento ainda em aberto quando a rede falha no meio).
 */
const RECONCILE_TX_WITH_RECEIVABLE = gql`
  mutation ReconcileTxWithReceivable(
    $txId: uuid!
    $txSet: bank_transactions_set_input!
    $entryId: uuid!
    $entrySet: receivables_set_input!
  ) {
    update_bank_transactions_by_pk(pk_columns: { id: $txId }, _set: $txSet) {
      id
    }
    update_receivables_by_pk(pk_columns: { id: $entryId }, _set: $entrySet) {
      id
    }
  }
`;

const RECONCILE_TX_WITH_PAYABLE = gql`
  mutation ReconcileTxWithPayable(
    $txId: uuid!
    $txSet: bank_transactions_set_input!
    $entryId: uuid!
    $entrySet: payables_set_input!
  ) {
    update_bank_transactions_by_pk(pk_columns: { id: $txId }, _set: $txSet) {
      id
    }
    update_payables_by_pk(pk_columns: { id: $entryId }, _set: $entrySet) {
      id
    }
  }
`;
import { formatCurrency, formatDate } from "../../lib/format";
import { num, round2, effectiveStatus } from "../../lib/financeiro-utils";
import { Modal } from "../../components/financeiro/Modal";
import { Field, inputCls, Btn, EmptyState, MetricCard } from "../../components/financeiro/ui";

interface AccountRow {
  id: string;
  name: string;
  initial_balance: string | null;
  transactions_aggregate: { aggregate: { sum: { amount: string | null }; count: number } };
}

export default function Reconciliation() {
  const qc = useQueryClient();
  const accountsQ = useQuery({
    queryKey: ["fin-bank-accounts"],
    queryFn: () => gqlClient.request<{ bank_accounts: AccountRow[] }>(BANK_ACCOUNTS_QUERY),
  });
  const accounts = accountsQ.data?.bank_accounts ?? [];
  const [accountId, setAccountId] = useState<string>("");
  const account = accounts.find((a) => a.id === accountId) ?? accounts[0] ?? null;
  const activeAccountId = account?.id ?? "";

  const txQ = useQuery({
    queryKey: ["fin-bank-tx", activeAccountId],
    enabled: !!activeAccountId,
    queryFn: () =>
      gqlClient.request<{ bank_transactions: BankTransaction[] }>(BANK_TRANSACTIONS_QUERY, {
        accountId: activeAccountId,
      }),
  });
  const payablesQ = useQuery({
    queryKey: ["fin-payables"],
    queryFn: () => gqlClient.request<{ payables: Payable[] }>(PAYABLES_QUERY),
  });
  const receivablesQ = useQuery({
    queryKey: ["fin-receivables"],
    queryFn: () => gqlClient.request<{ receivables: Receivable[] }>(RECEIVABLES_FIN_QUERY),
  });

  const txs = txQ.data?.bank_transactions ?? [];
  const unreconciledTx = txs.filter((t) => !t.reconciled);
  const reconciledCount = txs.length - unreconciledTx.length;

  const openEntries = useMemo(() => {
    const pays = (payablesQ.data?.payables ?? [])
      .filter((p) => !p.reconciled && effectiveStatus(p.status, p.due_date) !== "cancelled")
      .map((p) => ({ kind: "payable" as const, entry: p }));
    const recs = (receivablesQ.data?.receivables ?? [])
      .filter((r) => !r.reconciled && effectiveStatus(r.status, r.due_date) !== "cancelled")
      .map((r) => ({ kind: "receivable" as const, entry: r }));
    return [...pays, ...recs];
  }, [payablesQ.data, receivablesQ.data]);

  const [selTx, setSelTx] = useState<string | null>(null);
  const [selEntry, setSelEntry] = useState<string | null>(null);
  const [entrySearch, setEntrySearch] = useState("");
  const [importOpen, setImportOpen] = useState(false);

  const selectedTx = txs.find((t) => t.id === selTx) ?? null;

  const candidateEntries = useMemo(() => {
    let list = openEntries;
    if (entrySearch.trim()) {
      const q = entrySearch.trim().toLowerCase();
      list = list.filter((e) => e.entry.description.toLowerCase().includes(q));
    }
    if (!selectedTx) return list;
    const credit = num(selectedTx.amount) >= 0;
    return list
      .filter((e) => (credit ? e.kind === "receivable" : e.kind === "payable"))
      .sort((a, b) => {
        const target = Math.abs(num(selectedTx.amount));
        return (
          Math.abs(num(a.entry.value) - target) - Math.abs(num(b.entry.value) - target)
        );
      });
  }, [selectedTx, openEntries, entrySearch]);

  const refetch = () => {
    qc.invalidateQueries({ queryKey: ["fin-bank-tx", activeAccountId] });
    qc.invalidateQueries({ queryKey: ["fin-bank-accounts"] });
    qc.invalidateQueries({ queryKey: ["fin-payables"] });
    qc.invalidateQueries({ queryKey: ["fin-receivables"] });
    qc.invalidateQueries({ queryKey: ["fin-overview"] });
  };

  async function reconcilePair() {
    const tx = txs.find((t) => t.id === selTx);
    const ent = openEntries.find((e) => e.entry.id === selEntry);
    if (!tx || !ent) return toast.error("Selecione uma movimentação e um lançamento.");
    const credit = num(tx.amount) >= 0;
    if ((credit && ent.kind !== "receivable") || (!credit && ent.kind !== "payable"))
      return toast.error("Crédito concilia com a receber; débito com a pagar.");
    try {
      const now = new Date().toISOString();
      // Um único request = uma transação no Hasura (tudo-ou-nada).
      await gqlClient.request(
        ent.kind === "receivable"
          ? RECONCILE_TX_WITH_RECEIVABLE
          : RECONCILE_TX_WITH_PAYABLE,
        {
          txId: tx.id,
          txSet: {
            reconciled: true,
            reconciled_at: now,
            [ent.kind === "receivable" ? "receivable_id" : "payable_id"]: ent.entry.id,
          },
          entryId: ent.entry.id,
          entrySet: {
            reconciled: true,
            reconciled_at: now,
            status: "paid",
            payment_date: tx.date,
            [ent.kind === "receivable" ? "received_value" : "paid_value"]: round2(
              Math.abs(num(tx.amount))
            ),
            bank_account_id: activeAccountId,
          },
        }
      );
      toast.success("Conciliado com sucesso.");
      setSelTx(null);
      setSelEntry(null);
      refetch();
    } catch {
      toast.error("Erro ao conciliar.");
    }
  }

  async function reconcileAlone(tx: BankTransaction) {
    try {
      await gqlClient.request(UPDATE_BANK_TRANSACTION, {
        id: tx.id,
        set: { reconciled: true, reconciled_at: new Date().toISOString() },
      });
      toast.success("Movimentação conciliada (sem vínculo).");
      refetch();
    } catch {
      toast.error("Erro ao conciliar.");
    }
  }

  async function undoReconcile(tx: BankTransaction) {
    try {
      await gqlClient.request(UPDATE_BANK_TRANSACTION, {
        id: tx.id,
        set: { reconciled: false, reconciled_at: null, payable_id: null, receivable_id: null },
      });
      toast.success("Conciliação desfeita.");
      refetch();
    } catch {
      toast.error("Erro ao desfazer.");
    }
  }

  if (accountsQ.isLoading) {
    return (
      <div className="flex items-center gap-2 text-slate-500">
        <Loader2 className="animate-spin" size={18} /> Carregando…
      </div>
    );
  }

  if (accountsQ.error || payablesQ.error || receivablesQ.error || txQ.error) {
    return (
      <ErrorState
        label="Não foi possível carregar os dados da conciliação."
        onRetry={() => {
          accountsQ.refetch();
          payablesQ.refetch();
          receivablesQ.refetch();
          txQ.refetch();
        }}
      />
    );
  }

  if (accounts.length === 0) {
    return (
      <EmptyState
        icon={Scale}
        title="Cadastre uma conta primeiro"
        description="A conciliação precisa de uma conta corrente com movimentações."
      />
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Conciliação bancária</h2>
          <p className="text-sm text-slate-500">
            Associe as movimentações do extrato aos lançamentos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className={inputCls + " w-auto"}
            value={activeAccountId}
            onChange={(e) => setAccountId(e.target.value)}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <Btn variant="secondary" onClick={() => setImportOpen(true)}>
            <Upload size={16} /> Importar extrato
          </Btn>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard
          label="Saldo da conta"
          value={formatCurrency(
            account ? num(account.initial_balance) + num(account.transactions_aggregate.aggregate.sum.amount) : 0
          )}
        />
        <MetricCard label="Não conciliadas" value={String(unreconciledTx.length)} accent="text-amber-600" />
        <MetricCard label="Conciliadas" value={String(reconciledCount)} accent="text-emerald-600" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-700">
            Extrato — movimentações não conciliadas
          </div>
          {txQ.isLoading ? (
            <div className="px-5 py-8 text-center text-slate-500">
              <Loader2 className="mx-auto animate-spin" size={18} />
            </div>
          ) : unreconciledTx.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-500">
              Tudo conciliado nesta conta.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {unreconciledTx.map((t) => {
                const amount = num(t.amount);
                const active = selTx === t.id;
                return (
                  <li
                    key={t.id}
                    className={`flex cursor-pointer items-center justify-between px-5 py-3 ${
                      active ? "bg-indigo-50" : "hover:bg-slate-50"
                    }`}
                    onClick={() => setSelTx(active ? null : t.id)}
                  >
                    <div>
                      <p className="font-medium text-slate-800">{t.description}</p>
                      <p className="text-xs text-slate-500">{formatDate(t.date)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`font-semibold ${amount >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                      >
                        {amount >= 0 ? "+" : "−"}
                        {formatCurrency(Math.abs(amount))}
                      </span>
                      <button
                        title="Conciliar sem vínculo"
                        aria-label="Conciliar sem vínculo"
                        onClick={(e) => {
                          e.stopPropagation();
                          reconcileAlone(t);
                        }}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600"
                      >
                        <Check size={15} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
            <span className="shrink-0 text-sm font-semibold text-slate-700">
              Lançamentos em aberto{" "}
              {selectedTx && <span className="text-indigo-500">· compatíveis</span>}
            </span>
            <div className="relative w-44">
              <Search
                size={13}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={entrySearch}
                onChange={(e) => setEntrySearch(e.target.value)}
                placeholder="Filtrar…"
                aria-label="Filtrar lançamentos em aberto"
                className="w-full rounded-md border border-slate-200 py-1 pl-7 pr-2 text-xs outline-none transition focus:border-indigo-400"
              />
            </div>
          </div>
          {candidateEntries.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-500">
              Nenhum lançamento em aberto para conciliar.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {candidateEntries.map(({ kind, entry }) => {
                const active = selEntry === entry.id;
                const match =
                  selectedTx && Math.abs(num(entry.value) - Math.abs(num(selectedTx.amount))) < 0.01;
                return (
                  <li
                    key={entry.id}
                    className={`flex cursor-pointer items-center justify-between px-5 py-3 ${
                      active ? "bg-indigo-50" : "hover:bg-slate-50"
                    }`}
                    onClick={() => setSelEntry(active ? null : entry.id)}
                  >
                    <div>
                      <p className="font-medium text-slate-800">
                        {entry.description}
                        {match && (
                          <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-700">
                            valor exato
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500">
                        {kind === "receivable" ? "A receber" : "A pagar"} · venc. {formatDate(entry.due_date)}
                      </p>
                    </div>
                    <span className="font-semibold text-slate-900">{formatCurrency(entry.value)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4">
        <p className="text-sm text-slate-500">
          {selTx && selEntry
            ? "Pronto para conciliar o par selecionado."
            : "Selecione uma movimentação e um lançamento para conciliar."}
        </p>
        <Btn onClick={reconcilePair} disabled={!selTx || !selEntry}>
          <Link2 size={16} /> Conciliar par
        </Btn>
      </div>

      {reconciledCount > 0 && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-700">
            Conciliadas
          </div>
          <ul className="divide-y divide-slate-100">
            {txs
              .filter((t) => t.reconciled)
              .map((t) => {
                const amount = num(t.amount);
                const link = t.receivable?.description ?? t.payable?.description;
                return (
                  <li key={t.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="font-medium text-slate-700">{t.description}</p>
                      <p className="text-xs text-slate-500">
                        {formatDate(t.date)}
                        {link ? ` · vínculo: ${link}` : " · sem vínculo"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`font-semibold ${amount >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {amount >= 0 ? "+" : "−"}
                        {formatCurrency(Math.abs(amount))}
                      </span>
                      <button
                        title="Desfazer conciliação"
                        onClick={() => undoReconcile(t)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Unlink size={15} />
                      </button>
                    </div>
                  </li>
                );
              })}
          </ul>
        </div>
      )}

      {importOpen && activeAccountId && (
        <ImportModal
          accountId={activeAccountId}
          onClose={() => setImportOpen(false)}
          onSaved={refetch}
        />
      )}
    </div>
  );
}

function ImportModal({
  accountId,
  onClose,
  onSaved,
}: {
  accountId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const parsed = useMemo(() => {
    return text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(/[;\t]/).map((p) => p.trim());
        if (parts.length < 3) return null;
        const [date, description, rawValue] = parts;
        const amount = Number(rawValue.replace(/\./g, "").replace(",", "."));
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(amount)) return null;
        return { date, description, amount };
      })
      .filter((x): x is { date: string; description: string; amount: number } => !!x);
  }, [text]);

  async function save() {
    if (parsed.length === 0) return toast.error("Nenhuma linha válida para importar.");
    setSaving(true);
    try {
      await gqlClient.request(INSERT_BANK_TRANSACTIONS, {
        objs: parsed.map((p) => ({
          bank_account_id: accountId,
          date: p.date,
          description: p.description,
          amount: p.amount,
          kind: p.amount >= 0 ? "credit" : "debit",
        })),
      });
      toast.success(`${parsed.length} movimentação(ões) importada(s).`);
      onSaved();
      onClose();
    } catch {
      toast.error("Erro ao importar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="Importar extrato"
      subtitle="Cole as linhas no formato: data;descrição;valor"
      footer={
        <>
          <Btn variant="secondary" onClick={onClose}>
            Cancelar
          </Btn>
          <Btn onClick={save} disabled={saving || parsed.length === 0}>
            {saving ? "Importando…" : `Importar ${parsed.length || ""}`}
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        <Field
          label="Linhas do extrato"
          hint="Uma por linha. Valor negativo = saída. Ex.: 2026-06-10;Pagamento fornecedor;-1500,00"
        >
          <textarea
            className={inputCls + " min-h-[180px] font-mono text-xs"}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"2026-06-01;Recebimento cliente A;2500,00\n2026-06-03;Tarifa bancária;-39,90"}
          />
        </Field>
        {parsed.length > 0 && (
          <p className="text-sm text-emerald-600">{parsed.length} linha(s) válida(s) detectada(s).</p>
        )}
      </div>
    </Modal>
  );
}
