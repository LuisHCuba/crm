import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Tags, Building2 } from "lucide-react";
import { toast } from "sonner";
import { gqlClient } from "../../lib/graphql";
import {
  INSERT_CATEGORY,
  UPDATE_CATEGORY,
  ARCHIVE_CATEGORY,
  INSERT_COST_CENTER,
  UPDATE_COST_CENTER,
  ARCHIVE_COST_CENTER,
  type RefCategory,
  type RefCostCenter,
} from "../../lib/queries/financeiro";
import { useFinReference } from "../../components/financeiro/hooks";
import { Modal } from "../../components/financeiro/Modal";
import { Field, inputCls, Btn } from "../../components/financeiro/ui";

export default function Settings() {
  const qc = useQueryClient();
  const ref = useFinReference();
  const [catModal, setCatModal] = useState<{ open: boolean; edit: RefCategory | null }>({
    open: false,
    edit: null,
  });
  const [ccModal, setCcModal] = useState<{ open: boolean; edit: RefCostCenter | null }>({
    open: false,
    edit: null,
  });

  const refetch = () => qc.invalidateQueries({ queryKey: ["fin-reference"] });

  async function archiveCat(c: RefCategory) {
    if (!confirm(`Arquivar a categoria "${c.name}"?`)) return;
    try {
      await gqlClient.request(ARCHIVE_CATEGORY, { id: c.id });
      toast.success("Categoria arquivada.");
      refetch();
    } catch {
      toast.error("Erro ao arquivar.");
    }
  }
  async function archiveCc(c: RefCostCenter) {
    if (!confirm(`Arquivar o centro de custo "${c.name}"?`)) return;
    try {
      await gqlClient.request(ARCHIVE_COST_CENTER, { id: c.id });
      toast.success("Centro de custo arquivado.");
      refetch();
    } catch {
      toast.error("Erro ao arquivar.");
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-bold text-slate-900">Cadastros</h2>
        <p className="text-sm text-slate-500">Plano de contas (categorias) e centros de custo</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <Tags size={18} className="text-indigo-500" />
              <h3 className="font-semibold text-slate-900">Categorias</h3>
            </div>
            <Btn variant="secondary" onClick={() => setCatModal({ open: true, edit: null })}>
              <Plus size={15} /> Nova
            </Btn>
          </div>
          <ul className="divide-y divide-slate-100">
            {ref.categories.map((c) => (
              <li key={c.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      c.type === "revenue" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                    }`}
                  >
                    {c.type === "revenue" ? "Receita" : "Despesa"}
                  </span>
                  <span className="font-medium text-slate-800">{c.name}</span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setCatModal({ open: true, edit: c })}
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => archiveCat(c)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            ))}
            {ref.categories.length === 0 && (
              <li className="px-5 py-8 text-center text-sm text-slate-400">Nenhuma categoria.</li>
            )}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <Building2 size={18} className="text-indigo-500" />
              <h3 className="font-semibold text-slate-900">Centros de custo</h3>
            </div>
            <Btn variant="secondary" onClick={() => setCcModal({ open: true, edit: null })}>
              <Plus size={15} /> Novo
            </Btn>
          </div>
          <ul className="divide-y divide-slate-100">
            {ref.costCenters.map((c) => (
              <li key={c.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-2">
                  {c.code && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-slate-500">
                      {c.code}
                    </span>
                  )}
                  <span className="font-medium text-slate-800">{c.name}</span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setCcModal({ open: true, edit: c })}
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => archiveCc(c)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            ))}
            {ref.costCenters.length === 0 && (
              <li className="px-5 py-8 text-center text-sm text-slate-400">Nenhum centro de custo.</li>
            )}
          </ul>
        </div>
      </div>

      {catModal.open && (
        <CategoryModal
          edit={catModal.edit}
          onClose={() => setCatModal({ open: false, edit: null })}
          onSaved={refetch}
        />
      )}
      {ccModal.open && (
        <CostCenterModal
          edit={ccModal.edit}
          onClose={() => setCcModal({ open: false, edit: null })}
          onSaved={refetch}
        />
      )}
    </div>
  );
}

function CategoryModal({
  edit,
  onClose,
  onSaved,
}: {
  edit: RefCategory | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(edit?.name ?? "");
  const [type, setType] = useState<"revenue" | "expense">(edit?.type ?? "expense");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return toast.error("Informe o nome.");
    setSaving(true);
    try {
      const obj = { name: name.trim(), type };
      if (edit) await gqlClient.request(UPDATE_CATEGORY, { id: edit.id, set: obj });
      else await gqlClient.request(INSERT_CATEGORY, { obj });
      toast.success("Categoria salva.");
      onSaved();
      onClose();
    } catch {
      toast.error("Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={edit ? "Editar categoria" : "Nova categoria"}
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
        <Field label="Nome" required>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Tipo" required>
          <select
            className={inputCls}
            value={type}
            onChange={(e) => setType(e.target.value as "revenue" | "expense")}
          >
            <option value="expense">Despesa</option>
            <option value="revenue">Receita</option>
          </select>
        </Field>
      </div>
    </Modal>
  );
}

function CostCenterModal({
  edit,
  onClose,
  onSaved,
}: {
  edit: RefCostCenter | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(edit?.name ?? "");
  const [code, setCode] = useState(edit?.code ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return toast.error("Informe o nome.");
    setSaving(true);
    try {
      const obj = { name: name.trim(), code: code.trim() || null };
      if (edit) await gqlClient.request(UPDATE_COST_CENTER, { id: edit.id, set: obj });
      else await gqlClient.request(INSERT_COST_CENTER, { obj });
      toast.success("Centro de custo salvo.");
      onSaved();
      onClose();
    } catch {
      toast.error("Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={edit ? "Editar centro de custo" : "Novo centro de custo"}
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
        <Field label="Nome" required>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Código" hint="Opcional (ex.: ADM, COM)">
          <input className={inputCls} value={code} onChange={(e) => setCode(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
