import { gqlClient } from "./graphql";
import {
  CONTACTS_BY_IDS,
  FORM_SUBMISSIONS_QUERY,
  type FormSubmission,
} from "./queries/forms";

/** Busca submissões e enriquece com contatos (sem relationship Hasura). */
export async function fetchFormSubmissions(
  formId: string
): Promise<FormSubmission[]> {
  const { form_submissions } = await gqlClient.request<{
    form_submissions: FormSubmission[];
  }>(FORM_SUBMISSIONS_QUERY, { formId });

  const ids = [
    ...new Set(
      form_submissions
        .map((s) => s.contact_id)
        .filter((id): id is string => !!id)
    ),
  ];

  if (ids.length === 0) return form_submissions;

  const { contacts } = await gqlClient.request<{
    contacts: NonNullable<FormSubmission["contact"]>[];
  }>(CONTACTS_BY_IDS, { ids });

  const byId = new Map(contacts.map((c) => [c.id, c]));

  return form_submissions.map((s) => ({
    ...s,
    contact: s.contact_id ? byId.get(s.contact_id) ?? null : null,
  }));
}
