import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { gql } from "graphql-request";
import { gqlClient } from "../../lib/graphql";
import {
  INSERT_PAYABLE,
  UPDATE_PAYABLE,
  INSERT_RECEIVABLE,
  UPDATE_RECEIVABLE,
  INSERT_APPORTIONMENTS,
  DELETE_APPORTIONMENTS_PAYABLE,
  DELETE_APPORTIONMENTS_RECEIVABLE,
  type Payable,
  type Receivable,
  type RefCategory,
  type RefCostCenter,
  type RefBankAccount,
} from "../../lib/queries/financeiro";
import {
  fetchCompanyOption,
  fetchContactOption,
  fetchDealOption,
  searchCompanies,
  searchContacts,
  searchDeals,
  type SearchOption,
} from "../../lib/entity-search";
import { SearchSelect } from "../crm/SearchSelect";
import {
  num,
  round2,
  toISODate,
  validateApportionment,
  type ApportionmentInput,
} from "../../lib/financeiro-utils";
import { logActivity } from "../../lib/activity-log";
import { formatCurrency } from "../../lib/format";
import { Modal } from "./Modal";
import { ApportionmentEditor } from "./ApportionmentEditor";
import { Field, inputCls, Btn } from "./ui";

type Kind = "payable" | "receivable";

/*
 * Parcelas em UM único request (uma transação no Hasura): ou todas as
 * parcelas são criadas, ou nenhuma — sem estado parcial em caso de falha.
 */
const INSERT_PAYABLES_MANY = gql`
  mutation InsertPayablesMany($objs: [payables_insert_input!]!) {
    insert_payables(objects: $objs) {
      affected_rows
    }
  }
`;

const INSERT_RECEIVABLES_MANY = gql`
  mutation InsertReceivablesMany($objs: [receivables_insert_input!]!) {
    insert_receivables(objects: $objs) {
      affected_rows
    }
  }
`;

interface RefData {
  categories: RefCategory[];
  costCenters: RefCostCenter[];
  bankAccounts: RefBankAccount[];
}

export function LancamentoForm({
  kind,
  open,
  onClose,
  onSaved,
  editing,
  refData,
}: {
  kind: Kind;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing: Payable | Receivable | null;
  refData: RefData;
}) {
  const isReceivable = kind === "receivable";
  const isEdit = !!editing;

  const [description, setDescription] = useState(editing?.description ?? "");
  const [counterpart, setCounterpart] = useState(
    (isReceivable
      ? (editing as Receivable | null)?.payer_name
      : (editing as Payable | null)?.supplier_name) ?? ""
  );
  const [value, setValue] = useState<string>(editing ? String(num(editing.value)) : "");
  const [dueDate, setDueDate] = useState(editing?.due_date ?? toISODate(new Date()));
  const [status, setStatus] = useState(editing?.status ?? "pending");
  const [paymentDate, setPaymentDate] = useState(
    editing?.payment_date ?? toISODate(new Date())
  );
  const [paidValue, setPaidValue] = useState<string>(
    editing
      ? String(
          num(
            isReceivable
              ? (editing as Receivable).received_value ?? editing.value
              : (editing as Payable).paid_value ?? editing.value
          )
        )
      : ""
  );
  const [categoryId, setCategoryId] = useState(editing?.category_id ?? "");
  const [bankAccountId, setBankAccountId] = useState(editing?.bank_account_id ?? "");
  const [costCenterId, setCostCenterId] = useState(editing?.cost_center_id ?? "");
  // Empresa/negócio/contato: busca no servidor (escalável); rótulos
  // iniciais hidratados por id ao editar.
  const [company, setCompany] = useState<SearchOption | null>(null);
  const [deal, setDeal] = useState<SearchOption | null>(null);
  const [contact, setContact] = useState<SearchOption | null>(null);
  useEffect(() => {
    if (editing?.company_id)
      fetchCompanyOption(editing.company_id).then((o) => o && setCompany(o));
    if (editing?.deal_id)
      fetchDealOption(editing.deal_id).then((o) => o && setDeal(o));
    if (editing?.contact_id)
      fetchContactOption(editing.contact_id).then((o) => o && setContact(o));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const companyId = company?.id ?? "";
  const dealId = deal?.id ?? "";
  const contactId = contact?.id ?? "";
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [parcels, setParcels] = useState(1);
  const [apport, setApport] = useState<ApportionmentInput[]>(
    editing?.apportionments?.map((a) => ({
      category_id: a.category_id,
      cost_center_id: a.cost_center_id,
      percentage: a.percentage != null ? num(a.percentage) : null,
      value: num(a.value),
    })) ?? []
  );
  const [saving, setSaving] = useState(false);

  const totalValue = num(value);
  const cats = useMemo(
    () => refData.categories.filter((c) => c.type === (isReceivable ? "revenue" : "expense")),
    [refData.categories, isReceivable]
  );

  async function handleSave() {
    if (!description.trim()) return toast.error("Informe a descrição.");
    if (totalValue <= 0) return toast.error("O valor deve ser maior que zero.");
    if (!dueDate) return toast.error("Informe o vencimento.");

    const multi = !isEdit && parcels > 1;
    if (apport.length > 0 && !multi) {
      const v = validateApportionment(apport, totalValue);
      if (!v.ok) return toast.error(v.message ?? "Rateio inválido.");
    }

    setSaving(true);
    try {
      const base: Record<string, unknown> = {
        description: description.trim(),
        category_id: categoryId || null,
        bank_account_id: bankAccountId || null,
        cost_center_id: costCenterId || null,
        company_id: companyId || null,
        notes: notes.trim() || null,
        status,
      };
      base[isReceivable ? "payer_name" : "supplier_name"] = counterpart.trim() || null;
      base.deal_id = dealId || null;
      base.contact_id = contactId || null;
      if (status === "paid") {
        base.payment_date = paymentDate || toISODate(new Date());
        base[isReceivable ? "received_value" : "paid_value"] = num(paidValue) || totalValue;
      } else {
        base.payment_date = null;
        base[isReceivable ? "received_value" : "paid_value"] = null;
      }

      if (isEdit) {
        const set = { ...base, value: totalValue, due_date: dueDate };
        await gqlClient.request(isReceivable ? UPDATE_RECEIVABLE : UPDATE_PAYABLE, {
          id: editing!.id,
          set,
        });
        await saveApportionments(editing!.id);
      } else if (multi) {
        const group = crypto.randomUUID();
        const per = round2(totalValue / parcels);
        const baseDue = new Date(dueDate + "T00:00:00");
        const objs = Array.from({ length: parcels }, (_, i) => {
          const d = new Date(baseDue);
          d.setMonth(d.getMonth() + i);
          return {
            ...base,
            value: i === parcels - 1 ? round2(totalValue - per * (parcels - 1)) : per,
            due_date: toISODate(d),
            parcel_group: group,
            parcel_label: `${i + 1}/${parcels}`,
          };
        });
        // Uma transação: todas as parcelas ou nenhuma.
        await gqlClient.request(
          isReceivable ? INSERT_RECEIVABLES_MANY : INSERT_PAYABLES_MANY,
          { objs }
        );
      } else {
        const obj = { ...base, value: totalValue, due_date: dueDate };
        const res = await gqlClient.request<Record<string, { id: string }>>(
          isReceivable ? INSERT_RECEIVABLE : INSERT_PAYABLE,
          { obj }
        );
        const newId = isReceivable
          ? res.insert_receivables_one.id
          : res.insert_payables_one.id;
        await saveApportionments(newId);
      }

      const linkLabel = isReceivable ? "Conta a receber" : "Conta a pagar";
      await logActivity({
        title: isEdit
          ? `${linkLabel} atualizada: ${description.trim()}`
          : `${linkLabel} criada: ${description.trim()} · ${formatCurrency(
              totalValue
            )}`,
        body: `Vencimento ${dueDate}`,
        link: {
          dealId: dealId || undefined,
          contactId: contactId || undefined,
          companyId: companyId || undefined,
        },
      });

      toast.success(isEdit ? "Lançamento atualizado." : "Lançamento criado.");
      onSaved();
      onClose();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao salvar o lançamento.");
    } finally {
      setSaving(false);
    }
  }

  async function saveApportionments(entryId: string) {
    if (isEdit) {
      await gqlClient.request(
        isReceivable ? DELETE_APPORTIONMENTS_RECEIVABLE : DELETE_APPORTIONMENTS_PAYABLE,
        { id: entryId }
      );
    }
    if (apport.length === 0) return;
    const objs = apport.map((a) => ({
      [isReceivable ? "receivable_id" : "payable_id"]: entryId,
      category_id: a.category_id,
      cost_center_id: a.cost_center_id,
      percentage: a.percentage,
      value: a.value,
    }));
    await gqlClient.request(INSERT_APPORTIONMENTS, { objs });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={
        isEdit
          ? "Editar lançamento"
          : isReceivable
          ? "Nova conta a receber"
          : "Nova conta a pagar"
      }
      subtitle={isReceivable ? "Entrada de caixa" : "Saída de caixa"}
      footer={
        <>
          <Btn variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Btn>
          <Btn onClick={handleSave} disabled={saving}>
            {saving ? "Salvando…" : "Salvar"}
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Descrição" required>
          <input
            className={inputCls}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={isReceivable ? "Ex.: Mensalidade cliente X" : "Ex.: Aluguel sala comercial"}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label={isReceivable ? "Pagador (cliente)" : "Fornecedor"}>
            <input
              className={inputCls}
              value={counterpart}
              onChange={(e) => setCounterpart(e.target.value)}
            />
          </Field>
          <Field label="Categoria">
            <select
              className={inputCls}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">—</option>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Field label="Valor total" required>
            <input
              type="number"
              step="0.01"
              min="0"
              className={inputCls + " text-right"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </Field>
          <Field label="Vencimento" required>
            <input
              type="date"
              className={inputCls}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </Field>
          {!isEdit ? (
            <Field label="Parcelas" hint={parcels > 1 ? "Mensais; desativa rateio" : undefined}>
              <input
                type="number"
                min="1"
                max="120"
                className={inputCls + " text-right"}
                value={parcels}
                onChange={(e) => setParcels(Math.max(1, Math.floor(num(e.target.value))))}
              />
            </Field>
          ) : (
            <Field label="Status">
              <select
                className={inputCls}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="pending">A vencer</option>
                <option value="paid">{isReceivable ? "Recebido" : "Pago"}</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </Field>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Conta bancária">
            <select
              className={inputCls}
              value={bankAccountId}
              onChange={(e) => setBankAccountId(e.target.value)}
            >
              <option value="">—</option>
              {refData.bankAccounts.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Centro de custo">
            <select
              className={inputCls}
              value={costCenterId}
              onChange={(e) => setCostCenterId(e.target.value)}
            >
              <option value="">—</option>
              {refData.costCenters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Field label="Empresa">
            <SearchSelect
              value={company}
              onChange={setCompany}
              loadOptions={(q) => searchCompanies(q)}
              placeholder="—"
              searchPlaceholder="Buscar empresa..."
            />
          </Field>
          <Field label="Negócio">
            <SearchSelect
              value={deal}
              onChange={setDeal}
              loadOptions={(q) => searchDeals(q)}
              placeholder="—"
              searchPlaceholder="Buscar negócio..."
            />
          </Field>
          <Field label="Contato">
            <SearchSelect
              value={contact}
              onChange={setContact}
              loadOptions={(q) => searchContacts(q)}
              placeholder="—"
              searchPlaceholder="Buscar contato..."
            />
          </Field>
        </div>

        {isEdit && status === "paid" && (
          <div className="grid grid-cols-2 gap-4">
            <Field label={isReceivable ? "Data de recebimento" : "Data de pagamento"}>
              <input
                type="date"
                className={inputCls}
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </Field>
            <Field label={isReceivable ? "Valor recebido" : "Valor pago"}>
              <input
                type="number"
                step="0.01"
                className={inputCls + " text-right"}
                value={paidValue}
                onChange={(e) => setPaidValue(e.target.value)}
              />
            </Field>
          </div>
        )}

        <Field label="Observações">
          <textarea
            className={inputCls + " min-h-[64px] resize-y"}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>

        {(isEdit || parcels === 1) && (
          <ApportionmentEditor
            items={apport}
            onChange={setApport}
            total={totalValue}
            categories={refData.categories}
            costCenters={refData.costCenters}
          />
        )}
      </div>
    </Modal>
  );
}
