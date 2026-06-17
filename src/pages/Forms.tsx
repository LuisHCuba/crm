import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Trash2,
  Pencil,
  Search,
  ClipboardList,
  Link as LinkIcon,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { gqlClient } from "../lib/graphql";
import {
  ARCHIVE_FORM,
  CREATE_FORM,
  FORMS_LIST,
  emptyDefinition,
  type FormRow,
} from "../lib/queries/forms";
import { formatDate } from "../lib/format";
import { PageHeader } from "../components/PageHeader";
import { Badge, EmptyState, ErrorState, Loading } from "../components/crm/ui";

function publicLink(id: string) {
  return `${window.location.origin}/f/${id}`;
}

export default function Forms() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["forms"],
    queryFn: () => gqlClient.request<{ forms: FormRow[] }>(FORMS_LIST),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      gqlClient.request<{ insert_forms_one: { id: string } }>(CREATE_FORM, {
        obj: {
          title: "Novo formulário",
          status: "draft",
          definition: emptyDefinition(),
        },
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["forms"] });
      navigate(`/formularios/${res.insert_forms_one.id}`);
    },
    onError: () => toast.error("Erro ao criar formulário"),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => gqlClient.request(ARCHIVE_FORM, { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forms"] });
      toast.success("Formulário arquivado");
    },
    onError: () => toast.error("Erro ao arquivar formulário"),
  });

  const filtered = useMemo(() => {
    const list = data?.forms ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((f) => f.title.toLowerCase().includes(q));
  }, [data, search]);

  const copyLink = async (id: string) => {
    const url = publicLink(id);
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link público copiado");
    } catch {
      toast.error("Não foi possível copiar. Link: " + url);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Formulários"
        subtitle={data ? `${data.forms.length} formulários` : "Carregando..."}
        action={
          <button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            <Plus size={16} /> Novo formulário
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

        {isLoading && <Loading />}
        {error && <ErrorState label="Erro ao carregar formulários." />}

        {data && filtered.length === 0 && (
          <EmptyState
            icon={<ClipboardList size={22} />}
            title="Nenhum formulário"
            description="Crie um formulário conversacional estilo Typebot e compartilhe um link público para captar leads."
            action={
              <button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
              >
                <Plus size={16} /> Novo formulário
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
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Atualizado em</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((f) => (
                    <tr key={f.id} className="group hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <p className="font-medium text-slate-900">{f.title}</p>
                        <p className="text-xs text-slate-400">/f/{f.id}</p>
                      </td>
                      <td className="px-5 py-3">
                        {f.status === "published" ? (
                          <Badge className="bg-emerald-50 text-emerald-700">
                            Publicado
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-600">
                            Rascunho
                          </Badge>
                        )}
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        {formatDate(f.updated_at)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => copyLink(f.id)}
                            className="rounded-md p-1.5 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                            title="Copiar link público"
                          >
                            <LinkIcon size={16} />
                          </button>
                          <a
                            href={publicLink(f.id)}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-md p-1.5 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                            title="Abrir link público"
                          >
                            <ExternalLink size={16} />
                          </a>
                          <button
                            onClick={() => navigate(`/formularios/${f.id}`)}
                            className="rounded-md p-1.5 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                            title="Editar"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => archiveMutation.mutate(f.id)}
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
    </div>
  );
}
