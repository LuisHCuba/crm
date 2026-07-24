import { useMemo, useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, UserRound, X } from "lucide-react";
import { fetchFormSubmissions } from "../lib/fetch-form-submissions";
import {
  submissionAnswerRows,
  submissionPreview,
} from "../lib/form-submission-display";
import { formatDateTime } from "../lib/format";
import type { FormDetailOutletContext } from "./FormDetailLayout";
import { EmptyState, ErrorState, Loading } from "../components/crm/ui";

export default function FormSubmissions() {
  const { id = "" } = useParams();
  const { form } = useOutletContext<FormDetailOutletContext>();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["form-submissions", id],
    queryFn: () => fetchFormSubmissions(id),
    enabled: !!id,
  });

  const submissions = data ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return submissions;
    return submissions.filter((s) => {
      const name = s.contact?.full_name?.toLowerCase() ?? "";
      const email = s.contact?.email?.toLowerCase() ?? "";
      const preview = submissionPreview(form.definition, s.data, 500).toLowerCase();
      return name.includes(q) || email.includes(q) || preview.includes(q);
    });
  }, [submissions, search, form.definition]);

  const selected =
    filtered.find((s) => s.id === selectedId) ??
    submissions.find((s) => s.id === selectedId) ??
    null;

  if (isLoading) {
    return (
      <div className="p-8">
        <Loading />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <ErrorState label="Erro ao carregar respostas." />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[480px] flex-col lg:flex-row">
      {/* Lista */}
      <div className="flex min-h-0 flex-1 flex-col border-b border-slate-200 lg:max-w-md lg:border-b-0 lg:border-r">
        <div className="border-b border-slate-100 p-4">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, e-mail ou resposta..."
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <p className="mt-2 text-xs text-slate-400">
            {filtered.length} de {submissions.length} resposta(s)
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {submissions.length === 0 ? (
            <EmptyState
              icon={<UserRound size={22} />}
              title="Nenhuma resposta"
              description="Quando alguém preencher o formulário público, a resposta aparece aqui e um contato é criado ou atualizado."
            />
          ) : filtered.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-500">
              Nenhum resultado para &quot;{search}&quot;.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filtered.map((s) => {
                const active = selectedId === s.id;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(s.id)}
                      className={`w-full px-4 py-3 text-left transition ${
                        active ? "bg-indigo-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900">
                            {s.contact?.full_name ?? "Lead sem nome"}
                          </p>
                          {s.contact?.email && (
                            <p className="truncate text-xs text-slate-500">
                              {s.contact.email}
                            </p>
                          )}
                          <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                            {submissionPreview(form.definition, s.data, 120)}
                          </p>
                        </div>
                        <span className="shrink-0 text-[10px] text-slate-400">
                          {formatDateTime(s.created_at)}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Detalhe */}
      <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/80 p-6">
        {!selected ? (
          <div className="flex h-full min-h-[240px] flex-col items-center justify-center text-center text-slate-400">
            <UserRound size={32} className="mb-2 opacity-40" />
            <p className="text-sm">Selecione uma resposta para ver os detalhes.</p>
          </div>
        ) : (
          <div className="mx-auto max-w-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {selected.contact?.full_name ?? "Resposta"}
                </h2>
                <p className="text-sm text-slate-500">
                  Enviado em {formatDateTime(selected.created_at)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="rounded-md p-1.5 text-slate-400 hover:bg-white hover:text-slate-600 lg:hidden"
                aria-label="Fechar detalhe"
              >
                <X size={18} />
              </button>
            </div>

            {selected.contact && (
              <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Contato
                </p>
                <p className="font-medium text-slate-900">
                  {selected.contact.full_name}
                </p>
                {selected.contact.email && (
                  <p className="text-sm text-slate-600">{selected.contact.email}</p>
                )}
                {selected.contact.phone && (
                  <p className="text-sm text-slate-600">{selected.contact.phone}</p>
                )}
                <Link
                  to={`/contatos/${selected.contact.id}`}
                  className="mt-3 inline-flex text-sm font-medium text-indigo-600 hover:underline"
                >
                  Abrir contato →
                </Link>
              </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-white">
              <p className="border-b border-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Respostas
              </p>
              <dl className="divide-y divide-slate-100">
                {submissionAnswerRows(form.definition, selected.data).map((row) => (
                  <div key={row.fieldId} className="px-4 py-3">
                    {row.stepTitle && (
                      <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-indigo-500">
                        {row.stepTitle}
                      </p>
                    )}
                    <dt className="text-xs font-medium text-slate-500">{row.label}</dt>
                    <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-900">
                      {row.value}
                    </dd>
                  </div>
                ))}
                {submissionAnswerRows(form.definition, selected.data).length === 0 && (
                  <p className="px-4 py-6 text-center text-sm text-slate-400">
                    Nenhum campo preenchido.
                  </p>
                )}
              </dl>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
