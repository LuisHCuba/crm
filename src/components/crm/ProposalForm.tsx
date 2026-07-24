import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { gqlClient } from "../../lib/graphql";
import {
  CREATE_PROPOSAL,
  UPDATE_PROPOSAL,
  type Proposal,
} from "../../lib/queries/proposals";
import {
  fetchDealOption,
  searchDeals,
  type SearchOption,
} from "../../lib/entity-search";
import { proposalToSrcDoc } from "../../lib/proposal-render";
import { SearchSelect } from "./SearchSelect";
import { Modal, SubmitButton } from "./ui";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";

export function ProposalForm({
  proposal,
  defaultDealId,
  onClose,
  onSaved,
}: {
  proposal?: Proposal;
  /** Pré-seleciona o negócio (ex.: criação a partir da página do negócio). */
  defaultDealId?: string;
  onClose: () => void;
  onSaved: (newId?: string) => void;
}) {
  const editing = !!proposal;
  const [title, setTitle] = useState(proposal?.title ?? "");
  const [content, setContent] = useState(proposal?.content ?? "");
  const [password, setPassword] = useState(proposal?.password ?? "");
  // Negócio vinculado — busca no servidor; rótulo inicial via by_pk.
  const [deal, setDeal] = useState<SearchOption | null>(null);
  useEffect(() => {
    const did = proposal?.deal_id ?? defaultDealId;
    if (did) {
      fetchDealOption(did).then((opt) => {
        if (opt) setDeal(opt);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Preview com pequeno debounce para não regerar o srcDoc a cada tecla.
  const [debounced, setDebounced] = useState(content);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(content), 250);
    return () => clearTimeout(t);
  }, [content]);

  const srcDoc = useMemo(
    () => proposalToSrcDoc(debounced, title),
    [debounced, title]
  );

  const mutation = useMutation({
    mutationFn: async (): Promise<string> => {
      const set = {
        title: title.trim(),
        content,
        password: password.trim() ? password : null,
        deal_id: deal?.id ?? null,
      };
      if (editing) {
        await gqlClient.request(UPDATE_PROPOSAL, {
          id: proposal!.id,
          set: { ...set, updated_at: new Date().toISOString() },
        });
        return proposal!.id;
      }
      const res = await gqlClient.request<{
        insert_proposals_one: { id: string };
      }>(CREATE_PROPOSAL, { obj: set });
      return res.insert_proposals_one.id;
    },
    onSuccess: (id) => {
      toast.success(editing ? "Proposta atualizada" : "Proposta criada");
      onSaved(id);
      onClose();
    },
    onError: () => toast.error("Erro ao salvar proposta"),
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Informe um título");
      return;
    }
    mutation.mutate();
  };

  return (
    <Modal
      title={editing ? "Editar proposta" : "Nova proposta"}
      onClose={onClose}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Título<span className="text-red-500"> *</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Ex.: Proposta Comercial — Cliente X"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Senha de acesso
            </label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Deixe em branco para link aberto"
              className={inputClass}
            />
            <p className="mt-1 text-xs text-slate-400">
              Em branco = qualquer pessoa com o link acessa.
            </p>
          </div>
        </div>

        <div>
          <SearchSelect
            label="Negócio vinculado"
            value={deal}
            onChange={setDeal}
            loadOptions={(q) => searchDeals(q)}
            placeholder="Sem vínculo"
            searchPlaceholder="Buscar negócio..."
          />
          <p className="mt-1 text-xs text-slate-400">
            A proposta aparece no card "Propostas" da página do negócio.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Conteúdo (Markdown, HTML ou arquivo .html completo)
          </label>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={18}
              placeholder={"# Título\n\nTexto em **Markdown** ou <b>HTML</b>..."}
              className={`${inputClass} resize-none font-mono text-xs leading-relaxed`}
            />
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <div className="border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500">
                Pré-visualização (isolada)
              </div>
              <iframe
                title="Pré-visualização da proposta"
                srcDoc={srcDoc}
                sandbox="allow-popups allow-popups-to-escape-sandbox"
                className="h-[360px] w-full bg-white"
              />
            </div>
          </div>
        </div>

        <SubmitButton loading={mutation.isPending} />
      </form>
    </Modal>
  );
}
