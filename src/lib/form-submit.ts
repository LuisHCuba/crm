import { gql } from "graphql-request";
import { gqlClient } from "./graphql";
import { CREATE_ACTIVITY } from "./queries/crm";
import {
  CREATE_FORM_SUBMISSION,
  type FormRecord,
  type MapTo,
} from "./queries/forms";

/**
 * Envio de um formulário público.
 *
 * Fluxo:
 *  1. Monta os dados de contato a partir dos campos mapeados (mapTo).
 *  2. Faz dedup por e-mail: atualiza contato existente ou cria um novo.
 *  3. Cria uma NOTA na timeline do contato com o resumo de TODAS as respostas.
 *  4. Persiste a submissão crua em `form_submissions`.
 *
 * A nota e a submissão são resilientes (try/catch + console.error) — só a
 * criação/atualização do contato pode interromper o fluxo.
 *
 * Obs.: a página pública não tem usuário logado, por isso fazemos a mutation
 * de atividade direta (sem `logActivity`) com `created_by_id: null`.
 */

const CONTACT_BY_EMAIL = gql`
  query ContactByEmail($email: String!) {
    contacts(
      where: { email: { _eq: $email }, archived: { _eq: false } }
      limit: 1
    ) {
      id
    }
  }
`;

const INSERT_CONTACT = gql`
  mutation InsertContactFromForm($obj: contacts_insert_input!) {
    insert_contacts_one(object: $obj) {
      id
    }
  }
`;

const UPDATE_CONTACT = gql`
  mutation UpdateContactFromForm($id: uuid!, $set: contacts_set_input!) {
    update_contacts_by_pk(pk_columns: { id: $id }, _set: $set) {
      id
    }
  }
`;

type Answers = Record<string, string | string[]>;

const MAP_KEYS: Exclude<MapTo, "">[] = [
  "full_name",
  "email",
  "phone",
  "job_title",
];

function asText(value: string | string[] | undefined): string {
  if (value === undefined) return "";
  return Array.isArray(value) ? value.join(", ") : value;
}

/** Resumo legível "Label: valor", uma resposta por linha. */
function buildSummary(form: FormRecord, answers: Answers): string {
  const lines: string[] = [];
  for (const step of form.definition.steps) {
    for (const field of step.fields) {
      const raw = answers[field.id];
      const value = asText(raw).trim();
      if (value) lines.push(`${field.label}: ${value}`);
    }
  }
  return lines.join("\n");
}

export async function submitForm(
  form: FormRecord,
  answers: Answers
): Promise<{ contactId: string }> {
  // 1. Coletar valores mapeados.
  const mapped: Partial<Record<Exclude<MapTo, "">, string>> = {};
  for (const step of form.definition.steps) {
    for (const field of step.fields) {
      const key = field.mapTo;
      if (key && MAP_KEYS.includes(key as Exclude<MapTo, "">)) {
        const value = asText(answers[field.id]).trim();
        if (value) mapped[key as Exclude<MapTo, "">] = value;
      }
    }
  }

  // full_name é obrigatório; fallback para primeiro texto preenchido.
  let fullName = mapped.full_name;
  if (!fullName) {
    for (const step of form.definition.steps) {
      for (const field of step.fields) {
        const value = asText(answers[field.id]).trim();
        if (value) {
          fullName = value;
          break;
        }
      }
      if (fullName) break;
    }
  }
  if (!fullName) fullName = "Lead sem nome";

  const email = mapped.email;

  // 2. Dedup por e-mail / criação de contato.
  let contactId: string;
  let existingId: string | null = null;

  if (email) {
    try {
      const res = await gqlClient.request<{ contacts: { id: string }[] }>(
        CONTACT_BY_EMAIL,
        { email }
      );
      existingId = res.contacts[0]?.id ?? null;
    } catch (e) {
      console.error("Falha ao verificar contato existente:", e);
    }
  }

  if (existingId) {
    const set: Record<string, string> = { full_name: fullName };
    if (mapped.phone) set.phone = mapped.phone;
    if (mapped.job_title) set.job_title = mapped.job_title;
    await gqlClient.request(UPDATE_CONTACT, { id: existingId, set });
    contactId = existingId;
  } else {
    const obj: Record<string, string> = {
      full_name: fullName,
      stage: "new",
      origin: "website",
    };
    if (email) obj.email = email;
    if (mapped.phone) obj.phone = mapped.phone;
    if (mapped.job_title) obj.job_title = mapped.job_title;
    const res = await gqlClient.request<{
      insert_contacts_one: { id: string };
    }>(INSERT_CONTACT, { obj });
    contactId = res.insert_contacts_one.id;
  }

  // 3. Nota na timeline (resiliente).
  try {
    const body = buildSummary(form, answers);
    await gqlClient.request(CREATE_ACTIVITY, {
      obj: {
        type: "note",
        title: `Formulário: ${form.title}`,
        body: body || null,
        created_by_id: null,
        linked_contact_id: contactId,
      },
    });
  } catch (e) {
    console.error("Falha ao registrar nota do formulário:", e);
  }

  // 4. Submissão crua (resiliente).
  try {
    await gqlClient.request(CREATE_FORM_SUBMISSION, {
      obj: {
        form_id: form.id,
        contact_id: contactId,
        data: answers,
      },
    });
  } catch (e) {
    console.error("Falha ao registrar submissão do formulário:", e);
  }

  return { contactId };
}
