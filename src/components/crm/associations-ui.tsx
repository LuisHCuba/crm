import { useState, type ReactNode } from "react";
import { ChevronDown, Link2, Plus } from "lucide-react";
import { fieldInputClass } from "./ui";

/**
 * Card recolhível usado nas colunas de associação das record pages
 * (detalhe de contato e de negócio). Compartilhado para evitar duplicação.
 */
export function CollapsibleCard({
  title,
  count,
  onAdd,
  children,
  defaultOpen = true,
}: {
  title: string;
  count?: number;
  onAdd?: () => void;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <header className="flex items-center justify-between px-4 py-3">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 text-sm font-semibold text-slate-800"
        >
          <ChevronDown
            size={15}
            className={`text-slate-400 transition ${open ? "" : "-rotate-90"}`}
          />
          {title}
          {count !== undefined && (
            <span className="text-slate-400">({count})</span>
          )}
        </button>
        {onAdd && (
          <button
            onClick={onAdd}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-indigo-600 transition hover:bg-indigo-50"
            title="Adicionar"
          >
            <Plus size={14} /> Adicionar
          </button>
        )}
      </header>
      {open && (
        <div className="border-t border-slate-100 px-4 py-3">{children}</div>
      )}
    </section>
  );
}

/**
 * Painel de associação estilo HubSpot: oferece duas opções ao adicionar —
 * "Vincular existente" (select com registros já existentes) e "Criar novo"
 * (abre o form de criação do objeto). Ao criar, o registro é vinculado
 * automaticamente ao registro atual (o vínculo é responsabilidade de
 * `renderForm`, que recebe `onClose` e deve disparar o link no `onSaved`).
 */
export function AddAssociationPanel({
  options,
  selectPlaceholder,
  onLinkExisting,
  createLabel,
  renderForm,
  busy,
  onClose,
}: {
  /** Registros já existentes disponíveis para vínculo. */
  options: { id: string; label: string }[];
  selectPlaceholder: string;
  /** Vincula um registro já existente ao registro atual. */
  onLinkExisting: (id: string) => void;
  /** Rótulo do botão de criação (ex.: "Criar empresa"). */
  createLabel: string;
  /** Renderiza o form de criação; `onClose` fecha o painel inteiro. */
  renderForm: (onClose: () => void) => ReactNode;
  busy: boolean;
  /** Fecha o painel (volta ao estado inicial do card). */
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"choose" | "existing">("choose");
  const [creating, setCreating] = useState(false);

  return (
    <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50/70 p-2">
      {mode === "choose" && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode("existing")}
            disabled={busy}
            className="flex flex-1 items-center justify-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 transition hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-50"
          >
            <Link2 size={13} /> Vincular existente
          </button>
          <button
            type="button"
            onClick={() => setCreating(true)}
            disabled={busy}
            className="flex flex-1 items-center justify-center gap-1 rounded-md bg-indigo-600 px-2 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
          >
            <Plus size={13} /> {createLabel}
          </button>
        </div>
      )}

      {mode === "existing" && (
        <select
          className={fieldInputClass}
          defaultValue=""
          disabled={busy}
          autoFocus
          onChange={(e) => {
            if (e.target.value) {
              onLinkExisting(e.target.value);
              onClose();
            }
          }}
        >
          <option value="">{selectPlaceholder}</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      )}

      {creating &&
        renderForm(() => {
          setCreating(false);
          onClose();
        })}
    </div>
  );
}
