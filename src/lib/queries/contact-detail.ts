import { gql } from "graphql-request";
import type {
  ActivityType,
  ContactOrigin,
  ContactStage,
  StageType,
  UserRef,
} from "./crm";

/* ------------------------------------------------------------------ */
/*  Tipos da tela de detalhe do contato                                */
/* ------------------------------------------------------------------ */

export interface CompanyMini {
  id: string;
  legal_name: string;
  trade_name: string | null;
}

export interface DealMini {
  id: string;
  title: string;
  total_value: string | null;
  stage?: { id: string; name: string; type: StageType } | null;
  company?: { id: string; legal_name: string; trade_name: string | null } | null;
}

export interface ContactActivity {
  id: string;
  type: ActivityType;
  title: string | null;
  body: string | null;
  created_at: string;
  call_result?: string | null;
  call_duration_minutes?: number | null;
  meeting_date?: string | null;
  reminder_due_date?: string | null;
  email_subject?: string | null;
  created_by?: { id: string; name: string } | null;
}

/**
 * Contato com seus campos (incluindo os aditivos mobile_phone e start_intent)
 * e relações.
 */
export interface ContactDetailData {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  mobile_phone: string | null;
  job_title: string | null;
  stage: ContactStage;
  origin: ContactOrigin | null;
  created_at: string;
  updated_at: string;
  responsible?: UserRef | null;
  contact_companies?: { company: CompanyMini }[];
  deal_contacts?: { deal: DealMini }[];
  activities?: ContactActivity[];
}

/** Campos editáveis do contato (usados nas mutações de edição inline). */
export type ContactEditableField =
  | "full_name"
  | "email"
  | "phone"
  | "mobile_phone"
  | "job_title"
  | "stage"
  | "origin"
  | "responsible_id";

/* ------------------------------------------------------------------ */
/*  Query de detalhe                                                   */
/* ------------------------------------------------------------------ */

export const CONTACT_DETAIL_FULL = gql`
  query ContactDetailFull($id: uuid!) {
    contacts_by_pk(id: $id) {
      id
      full_name
      email
      phone
      mobile_phone
      job_title
      stage
      origin
      created_at
      updated_at
      responsible {
        id
        name
        avatar_url
      }
      contact_companies {
        company {
          id
          legal_name
          trade_name
        }
      }
      deal_contacts {
        deal {
          id
          title
          total_value
          stage {
            id
            name
            type
          }
          company {
            id
            legal_name
            trade_name
          }
        }
      }
      activities(order_by: { created_at: desc }) {
        id
        type
        title
        body
        created_at
        call_result
        call_duration_minutes
        meeting_date
        reminder_due_date
        email_subject
        created_by {
          id
          name
        }
      }
    }
  }
`;

/* ------------------------------------------------------------------ */
/*  Mutações                                                           */
/* ------------------------------------------------------------------ */

export const UPDATE_CONTACT_DETAIL = gql`
  mutation UpdateContactDetail($id: uuid!, $set: contacts_set_input!) {
    update_contacts_by_pk(pk_columns: { id: $id }, _set: $set) {
      id
    }
  }
`;

export const CREATE_CONTACT_ACTIVITY = gql`
  mutation CreateContactActivity($obj: activities_insert_input!) {
    insert_activities_one(object: $obj) {
      id
    }
  }
`;

export const LINK_CONTACT_COMPANY_DETAIL = gql`
  mutation LinkContactCompanyDetail($contact_id: uuid!, $company_id: uuid!) {
    insert_contact_companies_one(
      object: { contact_id: $contact_id, company_id: $company_id }
    ) {
      contact_id
    }
  }
`;

export const UNLINK_CONTACT_COMPANY_DETAIL = gql`
  mutation UnlinkContactCompanyDetail($contact_id: uuid!, $company_id: uuid!) {
    delete_contact_companies(
      where: {
        contact_id: { _eq: $contact_id }
        company_id: { _eq: $company_id }
      }
    ) {
      affected_rows
    }
  }
`;

export const LINK_DEAL_CONTACT_DETAIL = gql`
  mutation LinkDealContactDetail($deal_id: uuid!, $contact_id: uuid!) {
    insert_deal_contacts_one(
      object: { deal_id: $deal_id, contact_id: $contact_id }
      on_conflict: { constraint: deal_contacts_pk, update_columns: [] }
    ) {
      deal_id
    }
  }
`;

export const UNLINK_DEAL_CONTACT_DETAIL = gql`
  mutation UnlinkDealContactDetail($deal_id: uuid!, $contact_id: uuid!) {
    delete_deal_contacts(
      where: { deal_id: { _eq: $deal_id }, contact_id: { _eq: $contact_id } }
    ) {
      affected_rows
    }
  }
`;

/* ------------------------------------------------------------------ */
/*  Listas auxiliares para seletores de associação                     */
/* ------------------------------------------------------------------ */

export const COMPANIES_MINI_DETAIL = gql`
  query CompaniesMiniDetail {
    companies(
      where: { archived: { _eq: false } }
      order_by: { legal_name: asc }
    ) {
      id
      legal_name
      trade_name
    }
  }
`;

export const DEALS_MINI_DETAIL = gql`
  query DealsMiniDetail {
    deals(
      where: { archived: { _eq: false } }
      order_by: { created_at: desc }
    ) {
      id
      title
      total_value
      stage {
        id
        name
        type
      }
    }
  }
`;
