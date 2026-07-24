import { Link, NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ExternalLink,
  Link as LinkIcon,
  Loader2,
  Archive,
} from "lucide-react";
import { toast } from "sonner";
import { gqlClient } from "../lib/graphql";
import {
  ARCHIVE_FORM,
  FORM_DETAIL_QUERY,
  type FormRecord,
} from "../lib/queries/forms";
import { formatDate } from "../lib/format";
import { Badge, ErrorState, Loading } from "../components/crm/ui";

function publicLink(id: string) {
  return `${window.location.origin}/f/${id}`;
}

export function FormDetailLayout() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["form-detail", id],
    queryFn: () =>
      gqlClient.request<{
        forms_by_pk: FormRecord | null;
        form_submissions_aggregate: { aggregate: { count: number | null } };
      }>(FORM_DETAIL_QUERY, { id }),
    enabled: !!id,
  });

  const form = data?.forms_by_pk;
  const count = data?.form_submissions_aggregate?.aggregate?.count ?? 0;

  const archiveMutation = useMutation({
    mutationFn: () => gqlClient.request(ARCHIVE_FORM, { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forms"] });
      toast.success("Formulário arquivado");
      navigate("/formularios");
    },
    onError: () => toast.error("Erro ao arquivar"),
  });

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicLink(id));
      toast.success("Link copiado");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loading />
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="p-8">
        <ErrorState label="Formulário não encontrado." />
        <Link
          to="/formularios"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600"
        >
          <ArrowLeft size={16} /> Voltar
        </Link>
      </div>
    );
  }

  const tabClass = ({ isActive }: { isActive: boolean }) =>
    `border-b-2 px-4 py-3 text-sm font-medium transition ${
      isActive
        ? "border-indigo-600 text-indigo-700"
        : "border-transparent text-slate-500 hover:text-slate-800"
    }`;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 bg-white px-8 pt-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <Link
              to="/formularios"
              className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-indigo-600"
            >
              <ArrowLeft size={14} /> Formulários
            </Link>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="truncate text-xl font-bold text-slate-900">
                {form.title}
              </h1>
              {form.status === "published" ? (
                <Badge className="bg-emerald-50 text-emerald-700">Publicado</Badge>
              ) : (
                <Badge className="bg-slate-100 text-slate-600">Rascunho</Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {count} resposta{count !== 1 ? "s" : ""} · Atualizado{" "}
              {formatDate(form.updated_at)} ·{" "}
              <span className="font-mono text-xs text-slate-400">/f/{form.id}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={copyLink}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <LinkIcon size={15} /> Copiar link
            </button>
            <a
              href={publicLink(id)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <ExternalLink size={15} /> Abrir público
            </a>
            <button
              type="button"
              onClick={() => {
                if (confirm(`Arquivar "${form.title}"?`)) archiveMutation.mutate();
              }}
              disabled={archiveMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60"
            >
              {archiveMutation.isPending ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Archive size={15} />
              )}
              Arquivar
            </button>
          </div>
        </div>

        <nav className="-mb-px mt-5 flex gap-1 overflow-x-auto">
          <NavLink to={`/formularios/${id}`} end className={tabClass}>
            Visão geral
          </NavLink>
          <NavLink to={`/formularios/${id}/respostas`} className={tabClass}>
            Respostas{count > 0 ? ` (${count})` : ""}
          </NavLink>
          <NavLink to={`/formularios/${id}/editar`} className={tabClass}>
            Editor
          </NavLink>
        </nav>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <Outlet context={{ form, submissionCount: count }} />
      </div>
    </div>
  );
}

export type FormDetailOutletContext = {
  form: FormRecord;
  submissionCount: number;
};
