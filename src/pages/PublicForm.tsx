import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FileWarning, Loader2 } from "lucide-react";
import { gqlClient } from "../lib/graphql";
import { PUBLIC_FORM_BY_ID, type FormRecord } from "../lib/queries/forms";
import { submitForm } from "../lib/form-submit";
import { Conversation } from "../components/crm/form-builder/Conversation";

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
  const available =
    !!form && !form.archived && form.status === "published";

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-500">
        <Loader2 className="mr-2 animate-spin" size={20} /> Carregando
        formulário...
      </div>
    );
  }

  if (error || !available || !form) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-100 px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-200 text-slate-500">
          <FileWarning size={26} />
        </div>
        <h1 className="text-lg font-bold text-slate-800">
          Formulário indisponível
        </h1>
        <p className="max-w-sm text-sm text-slate-500">
          O link pode estar incorreto ou o formulário ainda não foi publicado.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Conversation
        definition={form.definition}
        onSubmit={async (answers) => {
          await submitForm(form, answers);
        }}
      />
    </div>
  );
}
