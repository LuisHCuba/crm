import { Link, useOutletContext, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ClipboardList,
  ExternalLink,
  Layers,
  ListChecks,
  MessageSquare,
  Pencil,
} from "lucide-react";
import { fetchFormSubmissions } from "../lib/fetch-form-submissions";
import {
  countFormFields,
  submissionPreview,
} from "../lib/form-submission-display";
import { formatDate, formatDateTime } from "../lib/format";
import type { FormDetailOutletContext } from "./FormDetailLayout";
import { MetricCard } from "../components/financeiro/ui";

function publicLink(id: string) {
  return `${window.location.origin}/f/${id}`;
}

export default function FormOverview() {
  const { id = "" } = useParams();
  const { form, submissionCount: count } = useOutletContext<FormDetailOutletContext>();
  const fields = countFormFields(form.definition);
  const steps = form.definition.steps.length;

  const { data } = useQuery({
    queryKey: ["form-submissions", id, "recent"],
    queryFn: () => fetchFormSubmissions(id),
    enabled: !!id,
  });

  const recent = (data ?? []).slice(0, 5);

  return (
    <div className="space-y-6 p-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Respostas" value={String(count)} accent="text-indigo-600" />
        <MetricCard label="Etapas" value={String(steps)} />
        <MetricCard label="Campos" value={String(fields)} />
        <MetricCard
          label="Status"
          value={form.status === "published" ? "Publicado" : "Rascunho"}
          accent={form.status === "published" ? "text-emerald-600" : "text-slate-600"}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare size={18} className="text-indigo-500" />
              <h2 className="font-semibold text-slate-900">Respostas recentes</h2>
            </div>
            {count > 0 && (
              <Link
                to={`/formularios/${id}/respostas`}
                className="text-sm font-medium text-indigo-600 hover:underline"
              >
                Ver todas
              </Link>
            )}
          </div>

          {recent.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 py-10 text-center">
              <p className="text-sm text-slate-500">Nenhuma resposta ainda.</p>
              {form.status !== "published" && (
                <p className="mt-1 text-xs text-amber-600">
                  Publique o formulário para começar a receber respostas.
                </p>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recent.map((s) => (
                <li key={s.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">
                        {s.contact?.full_name ?? "Sem contato vinculado"}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {submissionPreview(form.definition, s.data)}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-slate-400">
                      {formatDateTime(s.created_at)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 font-semibold text-slate-900">Estrutura</h2>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-center gap-2">
                <Layers size={15} className="text-slate-400" />
                {steps} etapa{steps !== 1 ? "s" : ""}
              </li>
              <li className="flex items-center gap-2">
                <ListChecks size={15} className="text-slate-400" />
                {fields} campo{fields !== 1 ? "s" : ""}
              </li>
              <li className="flex items-center gap-2">
                <ClipboardList size={15} className="text-slate-400" />
                Criado em {formatDate(form.created_at)}
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-5">
            <h2 className="mb-2 font-semibold text-slate-900">Ações rápidas</h2>
            <div className="flex flex-col gap-2">
              <Link
                to={`/formularios/${id}/editar`}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
              >
                <Pencil size={15} className="text-indigo-600" /> Editar formulário
              </Link>
              <a
                href={publicLink(id)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
              >
                <ExternalLink size={15} className="text-indigo-600" /> Abrir link público
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
