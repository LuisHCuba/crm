import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Plus,
  Landmark,
  ArrowLeftRight,
  Trash2,
  Pencil,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { gqlClient } from "../../lib/graphql";
import {
  BANK_ACCOUNTS_QUERY,
  BANK_TRANSACTIONS_QUERY,
  INSERT_BANK_ACCOUNT,
  UPDATE_BANK_ACCOUNT,
  ARCHIVE_BANK_ACCOUNT,
  INSERT_BANK_TRANSACTIONS,
  DELETE_BANK_TRANSACTION,
  type BankTransaction,
} from "../../lib/queries/financeiro";
import { formatCurrency, formatDate } from "../../lib/format";
import { num, toISODate } from "../../lib/financeiro-utils";
import { Modal } from "../../components/financeiro/Modal";
import { Field, inputCls, Btn, EmptyState } from "../../components/financeiro/ui";

interface AccountRow {
  id: string;
  name: string;
  bank_name: string | null;
  branch_account: string | null;
  account_type: string;
  initial_balance: string | null;
  transactions_aggregate: { aggregate: { sum: { amount: string | null }; count: number } };
}

const ACCOUNT_TYPES: Record<string, string> = {
  checking: "Conta corrente",
  savings: "Poupança",
  cash: "Caixa",
  investment: "Investimento",
};

export default function BankAccounts() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["fin-bank-accounts"],
    queryFn: () => gqlClient.request<{ bank_accounts: AccountRow[] }>(BANK_ACCOUNTS_QUERY),
  });
  const accounts = data?.bank_accounts ?? [];

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = accounts.find((a) => a.id === selectedId) ?? accounts[0] ?? null;

  const [accountModal, setAccountModal] = useState<{ open: boolean; edit: AccountRow | null }>({
    open: false,
    edit: null,
  });
  const [transferOpen, setTransferOpen] = useState(false);
  const [txModalAccount, setTxModalAccount] = useState<AccountRow | null>(null);

  const refetchAll = () => {
    qc.invalidateQueries({ queryKey: ["fin-bank-accounts"] });
    qc.invalidateQueries({ queryKey: ["fin-overview"] });
    if (selected) qc.invalidateQueries({ queryKey: ["fin-bank-tx", selected.id] });
  };

  const balanceOf = (a: AccountRow) =>
    num(a.initial_balance) + num(a.transactions_aggregate.aggregate.sum.amount);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-slate-500">
        <Loader2 className="animate-spin" size={18} /> Carregando contas…
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Contas correntes</h2>
          <p className="text-sm text-slate-500">{accounts.length} conta(s) cadastrada(s)</p>
        </div>
        <div className="flex gap-2">
          <Btn variant="secondary" onClick={() => setTransferOpen(true)} disabled={accounts.length < 2}>
            <ArrowLeftRight size={16} /> Transferência
          </Btn>
          <Btn onClick={() => setAccountModal({ open: true, edit: null })}>
            <Plus size={16} /> Nova conta
          </Btn>
        </div>
      </div>

      {accounts.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title="Nenhuma conta cadastrada"
          description="Cadastre suas contas correntes e caixas para controlar saldos e movimentações."
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-3">
            {accounts.map((a) => {
              const bal = balanceOf(a);
              const active = selected?.id === a.id;
              return (
                <button
                  key={a.id}
                  onClick={() => setSelectedId(a.id)}
                  className={`w-full rounded-xl border p-4 text-left transition-colors ${
                    active
                      ? "border-indigo-400 bg-indigo-50/50 ring-1 ring-indigo-200"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
                        <Wallet size={16} />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{a.name}</p>
                        <p className="text-xs text-slate-500">
                          {ACCOUNT_TYPES[a.account_type] ?? a.account_type}
                          {a.bank_name ? ` · ${a.bank_name}` : ""}
                        </p>
                      </div>
                    </div>
                    <Pencil
                      size={15}
                      className="text-slate-400 hover:text-slate-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAccountModal({ open: true, edit: a });
                      }}
                    />
                  </div>
                  <p className={`mt-3 text-xl font-bold ${bal >= 0 ? "text-slate-900" : "text-red-600"}`}>
                    {formatCurrency(bal)}
                  </p>
                  <p className="text-xs text-slate-400">
                    {a.transactions_aggregate.aggregate.count} movimentação(ões)
                  </p>
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-2">
            {selected && (
              <Statement
                account={selected}
                balance={balanceOf(selected)}
                onAddTx={() => setTxModalAccount(selected)}
                onChanged={refetchAll}
              />
            )}
          </div>
        </div>
      )}

      {accountModal.open && (
        <AccountModal
          edit={accountModal.edit}
          onClose={() => setAccountModal({ open: false, edit: null })}
          onSaved={refetchAll}
        />
      )}
      {transferOpen && (
        <TransferModal
          accounts={accounts}
          onClose={() => setTransferOpen(false)}
          onSaved={refetchAll}
        />
      )}
      {txModalAccount && (
        <ManualTxModal
          account={txModalAccount}
          onClose={() => setTxModalAccount(null)}
          onSaved={refetchAll}
        />
      )}
    </div>
  );
}

function Statement({
  account,
  balance,
  onAddTx,
  onChanged,
}: {
  account: AccountRow;
  balance: number;
  onAddTx: () => void;
  onChanged: () => void;
}) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["fin-bank-tx", account.id],
    queryFn: () =>
      gqlClient.request<{ bank_transactions: BankTransaction[] }>(BANK_TRANSACTIONS_QUERY, {
        accountId: account.id,
      }),
  });
  const txs = data?.bank_transactions ?? [];

  async function remove(id: string) {
    if (!confirm("Excluir esta movimentação?")) return;
    try {
      await gqlClient.request(DELETE_BANK_TRANSACTION, { id });
      toast.success("Movimentação excluída.");
      qc.invalidateQueries({ queryKey: ["fin-bank-tx", account.id] });
      onChanged();
    } catch {
      toast.error("Erro ao excluir.");
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h3 className="font-semibold text-slate-900">Extrato · {account.name}</h3>
          <p className="text-sm text-slate-500">
            Saldo atual:{" "}
            <span className={`font-semibold ${balance >= 0 ? "text-slate-900" : "text-red-600"}`}>
              {formatCurrency(balance)}
            </span>
          </p>
        </div>
        <Btn variant="secondary" onClick={onAddTx}>
          <Plus size={16} /> Movimentação
        </Btn>
      </div>
      {isLoading ? (
        <div className="flex items-center gap-2 px-5 py-8 text-slate-500">
          <Loader2 className="animate-spin" size={16} /> Carregando extrato…
        </div>
      ) : txs.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-slate-500">
          Sem movimentações nesta conta.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3">Data</th>
              <th className="px-5 py-3">Descrição</th>
              <th className="px-5 py-3 text-right">Valor</th>
              <th className="px-5 py-3 text-center">Conciliado</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {txs.map((t) => {
              const amount = num(t.amount);
              return (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 text-slate-500">{formatDate(t.date)}</td>
                  <td className="px-5 py-3 text-slate-700">
                    {t.description}
                    {t.transfer_group && (
                      <span className="ml-2 text-xs text-indigo-500">transferência</span>
                    )}
                  </td>
                  <td
                    className={`px-5 py-3 text-right font-semibold ${
                      amount >= 0 ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {amount >= 0 ? "+" : "−"}
                    {formatCurrency(Math.abs(amount))}
                  </td>
                  <td className="px-5 py-3 text-center">
                    {t.reconciled ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                        sim
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                        não
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => remove(t.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function AccountModal({
  edit,
  onClose,
  onSaved,
}: {
  edit: AccountRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(edit?.name ?? "");
  const [bankName, setBankName] = useState(edit?.bank_name ?? "");
  const [branch, setBranch] = useState(edit?.branch_account ?? "");
  const [type, setType] = useState(edit?.account_type ?? "checking");
  const [initial, setInitial] = useState(edit ? String(num(edit.initial_balance)) : "0");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return toast.error("Informe o nome da conta.");
    setSaving(true);
    try {
      const obj = {
        name: name.trim(),
        bank_name: bankName.trim() || null,
        branch_account: branch.trim() || null,
        account_type: type,
        initial_balance: num(initial),
      };
      if (edit) await gqlClient.request(UPDATE_BANK_ACCOUNT, { id: edit.id, set: obj });
      else await gqlClient.request(INSERT_BANK_ACCOUNT, { obj });
      toast.success("Conta salva.");
      onSaved();
      onClose();
    } catch {
      toast.error("Erro ao salvar conta.");
    } finally {
      setSaving(false);
    }
  }

  async function archive() {
    if (!edit) return;
    if (!confirm(`Arquivar a conta "${edit.name}"?`)) return;
    try {
      await gqlClient.request(ARCHIVE_BANK_ACCOUNT, { id: edit.id });
      toast.success("Conta arquivada.");
      onSaved();
      onClose();
    } catch {
      toast.error("Erro ao arquivar.");
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={edit ? "Editar conta" : "Nova conta"}
      footer={
        <>
          {edit && (
            <Btn variant="danger" onClick={archive} className="mr-auto">
              Arquivar
            </Btn>
          )}
          <Btn variant="secondary" onClick={onClose}>
            Cancelar
          </Btn>
          <Btn onClick={save} disabled={saving}>
            {saving ? "Salvando…" : "Salvar"}
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Nome" required>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Banco">
            <input className={inputCls} value={bankName} onChange={(e) => setBankName(e.target.value)} />
          </Field>
          <Field label="Agência / Conta">
            <input className={inputCls} value={branch} onChange={(e) => setBranch(e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Tipo">
            <select className={inputCls} value={type} onChange={(e) => setType(e.target.value)}>
              {Object.entries(ACCOUNT_TYPES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Saldo inicial" hint={edit ? "Altera o saldo base" : undefined}>
            <input
              type="number"
              step="0.01"
              className={inputCls + " text-right"}
              value={initial}
              onChange={(e) => setInitial(e.target.value)}
            />
          </Field>
        </div>
      </div>
    </Modal>
  );
}

function ManualTxModal({
  account,
  onClose,
  onSaved,
}: {
  account: AccountRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const [date, setDate] = useState(toISODate(new Date()));
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<"credit" | "debit">("credit");
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    const v = num(value);
    if (v <= 0) return toast.error("Informe um valor válido.");
    if (!description.trim()) return toast.error("Informe a descrição.");
    setSaving(true);
    try {
      await gqlClient.request(INSERT_BANK_TRANSACTIONS, {
        objs: [
          {
            bank_account_id: account.id,
            date,
            description: description.trim(),
            amount: kind === "credit" ? v : -v,
            kind,
          },
        ],
      });
      toast.success("Movimentação lançada.");
      qc.invalidateQueries({ queryKey: ["fin-bank-tx", account.id] });
      onSaved();
      onClose();
    } catch {
      toast.error("Erro ao lançar movimentação.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Nova movimentação"
      subtitle={account.name}
      footer={
        <>
          <Btn variant="secondary" onClick={onClose}>
            Cancelar
          </Btn>
          <Btn onClick={save} disabled={saving}>
            {saving ? "Salvando…" : "Lançar"}
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Data" required>
            <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Tipo" required>
            <select
              className={inputCls}
              value={kind}
              onChange={(e) => setKind(e.target.value as "credit" | "debit")}
            >
              <option value="credit">Entrada (crédito)</option>
              <option value="debit">Saída (débito)</option>
            </select>
          </Field>
        </div>
        <Field label="Descrição" required>
          <input className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Field label="Valor" required>
          <input
            type="number"
            step="0.01"
            className={inputCls + " text-right"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </Field>
      </div>
    </Modal>
  );
}

function TransferModal({
  accounts,
  onClose,
  onSaved,
}: {
  accounts: AccountRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [fromId, setFromId] = useState(accounts[0]?.id ?? "");
  const [toId, setToId] = useState(accounts[1]?.id ?? "");
  const [date, setDate] = useState(toISODate(new Date()));
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    const v = num(value);
    if (v <= 0) return toast.error("Informe um valor válido.");
    if (!fromId || !toId || fromId === toId)
      return toast.error("Selecione contas de origem e destino diferentes.");
    setSaving(true);
    try {
      const group = crypto.randomUUID();
      const fromName = accounts.find((a) => a.id === fromId)?.name ?? "";
      const toName = accounts.find((a) => a.id === toId)?.name ?? "";
      await gqlClient.request(INSERT_BANK_TRANSACTIONS, {
        objs: [
          {
            bank_account_id: fromId,
            date,
            description: `Transferência para ${toName}`,
            amount: -v,
            kind: "debit",
            transfer_group: group,
            reconciled: true,
            reconciled_at: new Date().toISOString(),
          },
          {
            bank_account_id: toId,
            date,
            description: `Transferência de ${fromName}`,
            amount: v,
            kind: "credit",
            transfer_group: group,
            reconciled: true,
            reconciled_at: new Date().toISOString(),
          },
        ],
      });
      toast.success("Transferência registrada.");
      onSaved();
      onClose();
    } catch {
      toast.error("Erro ao transferir.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Transferência entre contas"
      footer={
        <>
          <Btn variant="secondary" onClick={onClose}>
            Cancelar
          </Btn>
          <Btn onClick={save} disabled={saving}>
            {saving ? "Salvando…" : "Transferir"}
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="De" required>
            <select className={inputCls} value={fromId} onChange={(e) => setFromId(e.target.value)}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Para" required>
            <select className={inputCls} value={toId} onChange={(e) => setToId(e.target.value)}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Data" required>
            <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Valor" required>
            <input
              type="number"
              step="0.01"
              className={inputCls + " text-right"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </Field>
        </div>
      </div>
    </Modal>
  );
}
