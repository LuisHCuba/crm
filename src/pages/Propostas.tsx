import { useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Trash2,
  Pencil,
  Search,
  FileText,
  Link as LinkIcon,
  Lock,
  Globe,
  ExternalLink,
  Briefcase,
} from "lucide-react";
import { toast } from "sonner";
import { gqlClient } from "../lib/graphql";
import {
  ARCHIVE_PROPOSAL,
  PROPOSALS_LIST,
  PROPOSAL_BY_ID,
  type Proposal,
} from "../lib/queries/proposals";
import { formatDate } from "../lib/format";
import { PageHeader } from "../components/PageHeader";
import { ProposalForm } from "../components/crm/ProposalForm";
import { Badge, EmptyState, ErrorState, SkeletonRows } from "../components/crm/ui";

interface ProposalRow {
  id: string;
  title: string;
  archived: boolean;
  created_at: string;
  updated_at: string;
  password: string | null;
  deal_id: string | null;
  deal: { id: string; title: string } | null;
}

function publicLink(id: string) {
  return `${window.location.origin}/p/${id}`;
}

export default function Propostas() {
  const queryClient = useQueryClient();
  // undefined = fechado, null = nova, Proposal = editando
  const [formProposal, setFormProposal] = useState<
    Proposal | null | undefined
  >(undefined);
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["proposals"],
    queryFn: () =>
      gqlClient.request<{ proposals: ProposalRow[] }>(PROPOSALS_LIST),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => gqlClient.request(ARCHIVE_PROPOSAL, { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      toast.success("Proposta arquivada");
    },
    onError: () => toast.error("Erro ao arquivar proposta"),
  });

  const filtered = useMemo(() => {
    const list = data?.proposals ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((p) => p.title.toLowerCase().includes(q));
  }, [data, search]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["proposals"] });
    // O vínculo com negócio reflete nas telas de negócio.
    queryClient.invalidateQueries({ queryKey: ["deal-detail"] });
    queryClient.invalidateQueries({ queryKey: ["proposals-mini-unlinked"] });
  };

  const copyLink = async (id: string) => {
    const url = publicLink(id);
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link público copiado");
    } catch {
      toast.error("Não foi possível copiar. Link: " + url);
    }
  };

  const openEdit = async (id: string) => {
    try {
      const res = await gqlClient.request<{ proposals_by_pk: Proposal | null }>(
        PROPOSAL_BY_ID,
        { id }
      );
      if (!res.proposals_by_pk) {
        toast.error("Proposta não encontrada");
        return;
      }
      setFormProposal(res.proposals_by_pk);
    } catch {
      toast.error("Erro ao carregar proposta");
    }
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Propostas"
        subtitle={
          data ? `${data.proposals.length} propostas` : "Carregando..."
        }
        action={
          <button
            onClick={() => setFormProposal(null)}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            <Plus size={16} /> Nova proposta
          </button>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col gap-4 p-8">
        <div className="relative max-w-md">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título..."
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        {isLoading && (
          <div className="rounded-xl border border-slate-200 bg-white">
            <SkeletonRows />
          </div>
        )}
        {error && <ErrorState label="Erro ao carregar propostas." />}

        {data && filtered.length === 0 && (
          <EmptyState
            icon={<FileText size={22} />}
            title="Nenhuma proposta"
            description="Crie uma proposta com conteúdo em Markdown/HTML e gere um link público protegido por senha."
            action={
              <button
                onClick={() => setFormProposal(null)}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                <Plus size={16} /> Nova proposta
              </button>
            }
          />
        )}

        {data && filtered.length > 0 && (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Título</th>
                  <th className="px-5 py-3">Negócio</th>
                  <th className="px-5 py-3">Acesso</th>
                  <th className="px-5 py-3">Atualizada</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => (
                  <tr key={p.id} className="group hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-900">{p.title}</p>
                      <p className="text-xs text-slate-400">/p/{p.id}</p>
                    </td>
                    <td className="px-5 py-3">
                      {p.deal ? (
                        <RouterLink
                          to={`/negocios/${p.deal.id}`}
                          className="inline-flex max-w-[220px] items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100"
                          title={p.deal.title}
                        >
                          <Briefcase size={12} className="shrink-0" />
                          <span className="truncate">{p.deal.title}</span>
                        </RouterLink>
                      ) : (
                        <span className="text-xs text-slate-400">
                          Sem vínculo
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {p.password ? (
                        <Badge className="bg-amber-50 text-amber-700">
                          <Lock size={12} /> Com senha
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-50 text-emerald-700">
                          <Globe size={12} /> Aberto
                        </Badge>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {formatDate(p.updated_at)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => copyLink(p.id)}
                          className="rounded-md p-1.5 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                          title="Copiar link público"
                        >
                          <LinkIcon size={16} />
                        </button>
                        <a
                          href={publicLink(p.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md p-1.5 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                          title="Abrir link público"
                        >
                          <ExternalLink size={16} />
                        </a>
                        <button
                          onClick={() => openEdit(p.id)}
                          className="rounded-md p-1.5 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                          title="Editar"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Arquivar a proposta "${p.title}"?`))
                              archiveMutation.mutate(p.id);
                          }}
                          disabled={archiveMutation.isPending}
                          className="rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                          title="Arquivar"
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
          </div>
        )}
      </div>

      {formProposal !== undefined && (
        <ProposalForm
          proposal={formProposal ?? undefined}
          onClose={() => setFormProposal(undefined)}
          onSaved={invalidate}
        />
      )}
    </div>
  );
}
