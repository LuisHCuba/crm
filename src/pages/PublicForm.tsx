import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FileWarning, Loader2, Sparkles } from "lucide-react";
import { gqlClient } from "../lib/graphql";
import { PUBLIC_FORM_BY_ID, type FormRecord } from "../lib/queries/forms";
import { submitForm } from "../lib/form-submit";
import { Conversation } from "../components/crm/form-builder/Conversation";

function PublicFormShell({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "error";
}) {
  return (
    <div
      className={`flex min-h-screen flex-col items-center justify-center px-6 ${
        tone === "error"
          ? "bg-gradient-to-b from-slate-100 to-slate-200/80"
          : "bg-gradient-to-b from-[#eef2f7] to-[#e8edf4]"
      }`}
    >
      {children}
    </div>
  );
}

export default function PublicForm() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ["public-form", id],
    queryFn: () =>
      gqlClient.request<{ forms_by_pk: FormRecord | null }>(PUBLIC_FORM_BY_ID, {
        id,
      }),
    enabled: !!id,
    retry: false,
  });

  const form = data?.forms_by_pk ?? null;
  const available = !!form && !form.archived && form.status === "published";

  if (isLoading) {
    return (
      <PublicFormShell>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
            <Sparkles size={24} className="animate-pulse" />
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <Loader2 className="animate-spin" size={18} />
            Carregando formulário...
          </div>
        </div>
      </PublicFormShell>
    );
  }

  if (error || !available || !form) {
    return (
      <PublicFormShell tone="error">
        <div className="max-w-md text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-lg">
            <FileWarning size={28} />
          </div>
          <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-900">
            Formulário indisponível
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            O link pode estar incorreto, o formulário foi arquivado ou ainda não
            foi publicado.
          </p>
        </div>
      </PublicFormShell>
    );
  }

  return (
    <Conversation
      title={form.title}
      definition={form.definition}
      onSubmit={async (answers) => {
        await submitForm(form, answers);
      }}
    />
  );
}
