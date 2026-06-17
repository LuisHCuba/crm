import { gql } from "graphql-request";

/* ------------------------------------------------------------------ */
/*  Formulários (estilo Typebot)                                      */
/* ------------------------------------------------------------------ */

export type FieldType =
  | "text"
  | "email"
  | "phone"
  | "textarea"
  | "select"
  | "radio"
  | "number";

/** Propriedade de contato para a qual um campo pode ser mapeado. */
export type MapTo = "" | "full_name" | "email" | "phone" | "job_title";

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  mapTo?: MapTo;
}

export interface FormStep {
  id: string;
  title?: string;
  fields: FormField[];
}

export interface ThankYou {
  title: string;
  message: string;
  buttonLabel?: string;
  redirectUrl?: string;
}

export interface FormTheme {
  primary?: string;
  background?: string;
  logoUrl?: string;
}

export interface FormSettings {
  source?: string;
  description?: string;
}

export interface FormDefinition {
  steps: FormStep[];
  thankYou: ThankYou;
  theme: FormTheme;
  settings: FormSettings;
}

export type FormStatus = "draft" | "published";

/** Resumo para a listagem. */
export interface FormRow {
  id: string;
  title: string;
  status: FormStatus;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

/** Formulário completo (inclui a definição). */
export interface FormRecord {
  id: string;
  title: string;
  status: FormStatus;
  definition: FormDefinition;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

/** Definição inicial usada ao criar um novo formulário. */
export function emptyDefinition(): FormDefinition {
  return {
    steps: [
      {
        id: crypto.randomUUID(),
        title: "",
        fields: [
          {
            id: crypto.randomUUID(),
            type: "text",
            label: "Seu nome",
            placeholder: "",
            required: true,
            mapTo: "full_name",
          },
        ],
      },
    ],
    thankYou: {
      title: "Obrigado!",
      message: "Recebemos suas informações.",
      buttonLabel: "",
      redirectUrl: "",
    },
    theme: {
      primary: "#4f46e5",
      background: "",
      logoUrl: "",
    },
    settings: {
      source: "website",
      description: "",
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Queries                                                            */
/* ------------------------------------------------------------------ */

export const FORMS_LIST = gql`
  query FormsList {
    forms(where: { archived: { _eq: false } }, order_by: { updated_at: desc }) {
      id
      title
      status
      archived
      created_at
      updated_at
    }
  }
`;

export const FORM_BY_ID = gql`
  query FormById($id: uuid!) {
    forms_by_pk(id: $id) {
      id
      title
      status
      definition
      archived
      created_at
      updated_at
    }
  }
`;

/** Versão pública (rota /f/:id). */
export const PUBLIC_FORM_BY_ID = gql`
  query PublicFormById($id: uuid!) {
    forms_by_pk(id: $id) {
      id
      title
      status
      definition
      archived
    }
  }
`;

/* ------------------------------------------------------------------ */
/*  Mutations                                                          */
/* ------------------------------------------------------------------ */

export const CREATE_FORM = gql`
  mutation CreateForm($obj: forms_insert_input!) {
    insert_forms_one(object: $obj) {
      id
    }
  }
`;

export const UPDATE_FORM = gql`
  mutation UpdateForm($id: uuid!, $set: forms_set_input!) {
    update_forms_by_pk(pk_columns: { id: $id }, _set: $set) {
      id
    }
  }
`;

export const ARCHIVE_FORM = gql`
  mutation ArchiveForm($id: uuid!) {
    update_forms_by_pk(pk_columns: { id: $id }, _set: { archived: true }) {
      id
    }
  }
`;

export const CREATE_FORM_SUBMISSION = gql`
  mutation CreateFormSubmission($obj: form_submissions_insert_input!) {
    insert_form_submissions_one(object: $obj) {
      id
    }
  }
`;
