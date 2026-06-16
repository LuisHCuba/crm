import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Repeat, Play, Pencil, Trash2, Pause } from "lucide-react";
import { toast } from "sonner";
import { gqlClient } from "../../lib/graphql";
import {
  RECURRENCES_QUERY,
  INSERT_RECURRENCE,
  UPDATE_RECURRENCE,
  ARCHIVE_RECURRENCE,
  INSERT_PAYABLE,
  INSERT_RECEIVABLE,
  type Recurrence,
} from "../../lib/queries/financeiro";
import { formatCurrency, formatDate } from "../../lib/format";
import {
  num,
  toISODate,
  parseDate,
  nextDate,
  frequencyLabel,
  FREQUENCY_OPTIONS,
  type Frequency,
} from "../../lib/financeiro-utils";
import { logActivity } from "../../lib/activity-log";
import { useFinReference } from "../../components/financeiro/hooks";
import { Modal } from "../../components/financeiro/Modal";
import { Field, inputCls, Btn, EmptyState } from "../../components/financeiro/ui";

export default function Recurrences() {
  const qc = useQueryClient();
  const ref = useFinReference();
  const { data, isLoading } = useQuery({
    queryKey: ["fin-recurrences"],
    queryFn: () => gqlClient.request<{ recurrences: Recurrence[] }>(RECURRENCES_QUERY),
  });
  const list = data?.recurrences ?? [];
  const [modal, setModal] = useState<{ open: boolean; edit: Recurrence | null }>({
    open: false,
    edit: null,
  });

  const refetch = () => {
    qc.invalidateQueries({ queryKey: ["fin-recurrences"] });
    qc.invalidateQueries({ queryKey: ["fin-payables"] });
    qc.invalidateQueries({ queryKey: ["fin-receivables"] });
    qc.invalidateQueries({ queryKey: ["fin-overview"] });
  };

  async function generate(r: Recurrence) {
    try {
      const obj: Record<string, unknown> = {
        description: `${r.description} (${formatDate(r.next_run_date)})`,
        value: num(r.value),
        due_date: r.next_run_date,
        status: "pending",
        category_id: r.category_id,
        cost_center_id: r.cost_center_id,
        bank_account_id: r.bank_account_id,
        company_id: r.company_id,
        recurrence_id: r.id,
      };
      if (r.kind === "receivable") obj.deal_id = r.deal_id;
      await gqlClient.request(r.kind === "receivable" ? INSERT_RECEIVABLE : INSERT_PAYABLE, { obj });

      const base = parseDate(r.next_run_date) ?? new Date();
      const generated = r.occurrences_generated + 1;
      const reachedLimit = r.occurrences_total != null && generated >= r.occurrences_total;
      await gqlClient.request(UPDATE_RECURRENCE, {
        id: r.id,
        set: {
          occurrences_generated: generated,
          next_run_date: toISODate(nextDate(base, r.frequency as Frequency)),
          active: reachedLimit ? false : r.active,
        },
      });
      await logActivity({
        title: `Lançamento gerado por recorrência: ${r.description}`,
        body: `${
          r.kind === "receivable" ? "A receber" : "A pagar"
        } · ${formatCurrency(num(r.value))}`,
        link: {
          dealId: r.deal_id ?? undefined,
          companyId: r.company_id ?? undefined,
        },
      });
      toast.success("Lançamento gerado a partir da recorrência.");
      refetch();
    } catch {
      toast.error("Erro ao gerar lançamento.");
    }
  }

  async function toggle(r: Recurrence) {
    try {
      await gqlClient.request(UPDATE_RECURRENCE, { id: r.id, set: { active: !r.active } });
      refetch();
    } catch {
      toast.error("Erro ao atualizar.");
    }
  }

  async function archive(r: Recurrence) {
    if (!confirm(`Excluir a recorrência "${r.description}"?`)) return;
    try {
      await gqlClient.request(ARCHIVE_RECURRENCE, { id: r.id });
      toast.success("Recorrência excluída.");
      refetch();
    } catch {
      toast.error("Erro ao excluir.");
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-slate-500">
        <Loader2 className="animate-spin" size={18} /> Carregando recorrências…
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Recorrências</h2>
          <p className="text-sm text-slate-500">
            Regras automáticas de contas a pagar e a receber
          </p>
        </div>
        <Btn onClick={() => setModal({ open: true, edit: null })}>
          <Plus size={16} /> Nova recorrência
        </Btn>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title="Nenhuma recorrência"
          description="Crie regras (mensais, anuais, etc.) e gere lançamentos automaticamente."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Descrição</th>
                <th className="px-5 py-3">Tipo</th>
                <th className="px-5 py-3">Frequência</th>
                <th className="px-5 py-3 text-right">Valor</th>
                <th className="px-5 py-3">Próxima geração</th>
                <th className="px-5 py-3">Geradas</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map((r) => (
                <tr key={r.id} className={`hover:bg-slate-50 ${!r.active ? "opacity-60" : ""}`}>
                  <td className="px-5 py-3 font-medium text-slate-900">{r.description}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        r.kind === "receivable"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      {r.kind === "receivable" ? "A receber" : "A pagar"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{frequencyLabel(r.frequency)}</td>
                  <td className="px-5 py-3 text-right font-semibold text-slate-900">
                    {formatCurrency(r.value)}
                  </td>
                  <td className="px-5 py-3 text-slate-600">{formatDate(r.next_run_date)}</td>
                  <td className="px-5 py-3 text-slate-500">
                    {r.occurrences_generated}
                    {r.occurrences_total != null ? ` / ${r.occurrences_total}` : ""}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => generate(r)}
                        disabled={!r.active}
                        title="Gerar lançamento"
                        className="rounded-lg p-1.5 text-indigo-600 hover:bg-indigo-50 disabled:opacity-40"
                      >
                        <Play size={16} />
                      </button>
                      <button
                        onClick={() => toggle(r)}
                        title={r.active ? "Pausar" : "Reativar"}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                      >
                        <Pause size={16} />
                      </button>
                      <button
                        onClick={() => setModal({ open: true, edit: r })}
                        title="Editar"
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => archive(r)}
                        title="Excluir"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal.open && (
        <RecurrenceModal
          edit={modal.edit}
          refData={ref}
          onClose={() => setModal({ open: false, edit: null })}
          onSaved={refetch}
        />
      )}
    </div>
  );
}

function RecurrenceModal({
  edit,
  refData,
  onClose,
  onSaved,
}: {
  edit: Recurrence | null;
  refData: ReturnType<typeof useFinReference>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [kind, setKind] = useState<"payable" | "receivable">(edit?.kind ?? "payable");
  const [description, setDescription] = useState(edit?.description ?? "");
  const [value, setValue] = useState(edit ? String(num(edit.value)) : "");
  const [frequency, setFrequency] = useState<Frequency>((edit?.frequency as Frequency) ?? "monthly");
  const [startDate, setStartDate] = useState(edit?.start_date ?? toISODate(new Date()));
  const [nextRun, setNextRun] = useState(edit?.next_run_date ?? toISODate(new Date()));
  const [total, setTotal] = useState(edit?.occurrences_total != null ? String(edit.occurrences_total) : "");
  const [categoryId, setCategoryId] = useState(edit?.category_id ?? "");
  const [costCenterId, setCostCenterId] = useState(edit?.cost_center_id ?? "");
  const [bankAccountId, setBankAccountId] = useState(edit?.bank_account_id ?? "");
  const [saving, setSaving] = useState(false);

  const cats = refData.categories.filter(
    (c) => c.type === (kind === "receivable" ? "revenue" : "expense")
  );

  async function save() {
    if (!description.trim()) return toast.error("Informe a descrição.");
    if (num(value) <= 0) return toast.error("Informe um valor válido.");
    setSaving(true);
    try {
      const obj = {
        kind,
        description: description.trim(),
        value: num(value),
        frequency,
        start_date: startDate,
        next_run_date: nextRun,
        occurrences_total: total.trim() === "" ? null : Math.max(1, Math.floor(num(total))),
        category_id: categoryId || null,
        cost_center_id: costCenterId || null,
        bank_account_id: bankAccountId || null,
      };
      if (edit) await gqlClient.request(UPDATE_RECURRENCE, { id: edit.id, set: obj });
      else await gqlClient.request(INSERT_RECURRENCE, { obj });
      toast.success("Recorrência salva.");
      onSaved();
      onClose();
    } catch {
      toast.error("Erro ao salvar recorrência.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={edit ? "Editar recorrência" : "Nova recorrência"}
      footer={
        <>
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
        <div className="grid grid-cols-2 gap-4">
          <Field label="Tipo" required>
            <select
              className={inputCls}
              value={kind}
              onChange={(e) => setKind(e.target.value as "payable" | "receivable")}
            >
              <option value="payable">Conta a pagar</option>
              <option value="receivable">Conta a receber</option>
            </select>
          </Field>
          <Field label="Frequência" required>
            <select
              className={inputCls}
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as Frequency)}
            >
              {FREQUENCY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Descrição" required>
          <input className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Valor" required>
            <input
              type="number"
              step="0.01"
              className={inputCls + " text-right"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </Field>
          <Field label="Início">
            <input type="date" className={inputCls} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
          <Field label="Próxima geração" required>
            <input type="date" className={inputCls} value={nextRun} onChange={(e) => setNextRun(e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Nº de ocorrências" hint="Vazio = sem fim">
            <input
              type="number"
              min="1"
              className={inputCls + " text-right"}
              value={total}
              onChange={(e) => setTotal(e.target.value)}
            />
          </Field>
          <Field label="Categoria">
            <select className={inputCls} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">—</option>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Centro de custo">
            <select className={inputCls} value={costCenterId} onChange={(e) => setCostCenterId(e.target.value)}>
              <option value="">—</option>
              {refData.costCenters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Conta bancária">
            <select className={inputCls} value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)}>
              <option value="">—</option>
              {refData.bankAccounts.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>
    </Modal>
  );
}
