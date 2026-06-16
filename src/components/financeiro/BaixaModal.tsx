import { useState } from "react";
import { toast } from "sonner";
import { gqlClient } from "../../lib/graphql";
import {
  UPDATE_PAYABLE,
  UPDATE_RECEIVABLE,
  INSERT_BANK_TRANSACTIONS,
  type Payable,
  type Receivable,
  type RefBankAccount,
} from "../../lib/queries/financeiro";
import { num, toISODate } from "../../lib/financeiro-utils";
import { formatCurrency } from "../../lib/format";
import { logActivity } from "../../lib/activity-log";
import { Modal } from "./Modal";
import { Field, inputCls, Btn } from "./ui";

export function BaixaModal({
  kind,
  entry,
  open,
  onClose,
  onSaved,
  bankAccounts,
}: {
  kind: "payable" | "receivable";
  entry: Payable | Receivable;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  bankAccounts: RefBankAccount[];
}) {
  const isReceivable = kind === "receivable";
  const [date, setDate] = useState(toISODate(new Date()));
  const [paidValue, setPaidValue] = useState(String(num(entry.value)));
  const [bankAccountId, setBankAccountId] = useState(entry.bank_account_id ?? "");
  const [createTx, setCreateTx] = useState(true);
  const [saving, setSaving] = useState(false);

  async function handleConfirm() {
    const v = num(paidValue);
    if (v <= 0) return toast.error("Informe um valor válido.");
    setSaving(true);
    try {
      const set: Record<string, unknown> = {
        status: "paid",
        payment_date: date,
        bank_account_id: bankAccountId || null,
        [isReceivable ? "received_value" : "paid_value"]: v,
      };
      if (createTx && bankAccountId) {
        set.reconciled = true;
        set.reconciled_at = new Date().toISOString();
      }
      await gqlClient.request(isReceivable ? UPDATE_RECEIVABLE : UPDATE_PAYABLE, {
        id: entry.id,
        set,
      });

      if (createTx && bankAccountId) {
        const amount = isReceivable ? v : -v;
        await gqlClient.request(INSERT_BANK_TRANSACTIONS, {
          objs: [
            {
              bank_account_id: bankAccountId,
              date,
              description: entry.description,
              amount,
              kind: isReceivable ? "credit" : "debit",
              reconciled: true,
              reconciled_at: new Date().toISOString(),
              [isReceivable ? "receivable_id" : "payable_id"]: entry.id,
            },
          ],
        });
      }

      await logActivity({
        title: isReceivable
          ? `Recebimento registrado: ${entry.description}`
          : `Pagamento registrado: ${entry.description}`,
        body: `Valor: ${formatCurrency(v)} em ${date}`,
        link: {
          dealId: entry.deal_id ?? undefined,
          contactId: entry.contact_id ?? undefined,
          companyId: entry.company_id ?? undefined,
        },
      });

      toast.success(isReceivable ? "Recebimento registrado." : "Pagamento registrado.");
      onSaved();
      onClose();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao registrar a baixa.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isReceivable ? "Registrar recebimento" : "Registrar pagamento"}
      subtitle={`${entry.description} · ${formatCurrency(entry.value)}`}
      footer={
        <>
          <Btn variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Btn>
          <Btn onClick={handleConfirm} disabled={saving}>
            {saving ? "Salvando…" : "Confirmar baixa"}
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label={isReceivable ? "Data de recebimento" : "Data de pagamento"} required>
            <input
              type="date"
              className={inputCls}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
          <Field label={isReceivable ? "Valor recebido" : "Valor pago"} required>
            <input
              type="number"
              step="0.01"
              className={inputCls + " text-right"}
              value={paidValue}
              onChange={(e) => setPaidValue(e.target.value)}
            />
          </Field>
        </div>
        <Field label={isReceivable ? "Conta de crédito" : "Conta de débito"}>
          <select
            className={inputCls}
            value={bankAccountId}
            onChange={(e) => setBankAccountId(e.target.value)}
          >
            <option value="">— Selecione —</option>
            {bankAccounts.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={createTx}
            onChange={(e) => setCreateTx(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600"
          />
          Lançar movimentação na conta e conciliar automaticamente
        </label>
        {createTx && !bankAccountId && (
          <p className="text-xs text-amber-600">
            Selecione uma conta para gerar a movimentação bancária.
          </p>
        )}
      </div>
    </Modal>
  );
}
