import { gql } from "graphql-request";
import type {
  ActivityType,
  DealLossReason,
  StageType,
  UserRef,
} from "./crm";

/* ------------------------------------------------------------------ */
/*  Tipos da tela de detalhe do negócio                                */
/* ------------------------------------------------------------------ */

export interface DealStageRef {
  id: string;
  name: string;
  type: StageType;
  order: number;
  pipeline_id: string;
}

export interface DealPipelineRef {
  id: string;
  name: string;
}

export interface DealCompanyRef {
  id: string;
  legal_name: string;
  trade_name: string | null;
}

export interface DealContactMini {
  id: string;
  full_name: string;
  email: string | null;
  job_title: string | null;
}

export interface DealLineItemFull {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: string;
  discount_percent: string | null;
  subtotal: string;
  product?: { id: string; name: string; sku: string | null; unit: string } | null;
}

/** Proposta vinculada ao negócio (resumo para o card de associações). */
export interface DealProposalMini {
  id: string;
  title: string;
  password: string | null;
  updated_at: string;
}

export interface DealActivity {
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

/** Negócio com seus campos e relações. */
export interface DealDetailData {
  id: string;
  title: string;
  total_value: string | null;
  forecast_date: string | null;
  closed_at: string | null;
  created_at: string;
  pipeline_id: string;
  stage_id: string;
  company_id: string | null;
  loss_reason: DealLossReason | null;
  responsible?: UserRef | null;
  stage?: DealStageRef | null;
  pipeline?: DealPipelineRef | null;
  company?: DealCompanyRef | null;
  deal_contacts?: { contact: DealContactMini }[];
  line_items?: DealLineItemFull[];
  activities?: DealActivity[];
  proposals?: DealProposalMini[];
}

/** Campos editáveis do negócio (usados na edição inline). */
export type DealEditableField =
  | "title"
  | "total_value"
  | "forecast_date"
  | "closed_at"
  | "stage_id"
  | "pipeline_id"
  | "responsible_id"
  | "company_id";

export type DealFieldValue = string | number | boolean | null;

/* ------------------------------------------------------------------ */
/*  Query de detalhe                                                   */
/* ------------------------------------------------------------------ */

export const DEAL_DETAIL_FULL = gql`
  query DealDetailFull($id: uuid!) {
    deals_by_pk(id: $id) {
      id
      title
      total_value
      forecast_date
      closed_at
      created_at
      pipeline_id
      stage_id
      company_id
      loss_reason
      responsible {
        id
        name
        avatar_url
      }
      stage {
        id
        name
        type
        order
        pipeline_id
      }
      pipeline {
        id
        name
      }
      company {
        id
        legal_name
        trade_name
      }
      deal_contacts {
        contact {
          id
          full_name
          email
          job_title
        }
      }
      line_items {
        id
        product_id
        quantity
        unit_price
        discount_percent
        subtotal
        product {
          id
          name
          sku
          unit
        }
      }
      proposals(
        where: { archived: { _eq: false } }
        order_by: { updated_at: desc }
      ) {
        id
        title
        password
        updated_at
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
    pipelines(where: { archived: { _eq: false } }, order_by: { name: asc }) {
      id
      name
    }
    pipeline_stages(order_by: { order: asc }) {
      id
      name
      type
      order
      pipeline_id
    }
  }
`;

/* ------------------------------------------------------------------ */
/*  Mutações                                                           */
/* ------------------------------------------------------------------ */

export const UPDATE_DEAL_DETAIL = gql`
  mutation UpdateDealDetail($id: uuid!, $set: deals_set_input!) {
    update_deals_by_pk(pk_columns: { id: $id }, _set: $set) {
      id
    }
  }
`;

export const ARCHIVE_DEAL_DETAIL = gql`
  mutation ArchiveDealDetail($id: uuid!) {
    update_deals_by_pk(pk_columns: { id: $id }, _set: { archived: true }) {
      id
    }
  }
`;

export const CREATE_DEAL_ACTIVITY = gql`
  mutation CreateDealActivity($obj: activities_insert_input!) {
    insert_activities_one(object: $obj) {
      id
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

/** Vincula uma proposta existente a este negócio. */
export const LINK_DEAL_PROPOSAL = gql`
  mutation LinkDealProposal($proposal_id: uuid!, $deal_id: uuid!) {
    update_proposals_by_pk(
      pk_columns: { id: $proposal_id }
      _set: { deal_id: $deal_id }
    ) {
      id
    }
  }
`;

/** Desvincula a proposta do negócio (mantém a proposta). */
export const UNLINK_DEAL_PROPOSAL = gql`
  mutation UnlinkDealProposal($proposal_id: uuid!) {
    update_proposals_by_pk(
      pk_columns: { id: $proposal_id }
      _set: { deal_id: null }
    ) {
      id
    }
  }
`;

/** Propostas ativas ainda sem negócio (opções do painel de vínculo). */
export const PROPOSALS_MINI_UNLINKED = gql`
  query ProposalsMiniUnlinked {
    proposals(
      where: { archived: { _eq: false }, deal_id: { _is_null: true } }
      order_by: { updated_at: desc }
    ) {
      id
      title
    }
  }
`;

export const ADD_DEAL_LINE_ITEM = gql`
  mutation AddDealLineItem($obj: deal_line_items_insert_input!) {
    insert_deal_line_items_one(object: $obj) {
      id
    }
  }
`;

export const UPDATE_DEAL_LINE_ITEM = gql`
  mutation UpdateDealLineItem($id: uuid!, $set: deal_line_items_set_input!) {
    update_deal_line_items_by_pk(pk_columns: { id: $id }, _set: $set) {
      id
    }
  }
`;

export const DELETE_DEAL_LINE_ITEM = gql`
  mutation DeleteDealLineItem($id: uuid!) {
    delete_deal_line_items_by_pk(id: $id) {
      id
    }
  }
`;

/* ------------------------------------------------------------------ */
/*  Listas auxiliares para seletores                                   */
/* ------------------------------------------------------------------ */

export const CONTACTS_MINI_DEAL_DETAIL = gql`
  query ContactsMiniDealDetail {
    contacts(
      where: { archived: { _eq: false } }
      order_by: { full_name: asc }
    ) {
      id
      full_name
      email
      job_title
    }
  }
`;

export const COMPANIES_MINI_DEAL_DETAIL = gql`
  query CompaniesMiniDealDetail {
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

export const PRODUCTS_MINI_DEAL_DETAIL = gql`
  query ProductsMiniDealDetail {
    products(
      where: { archived: { _eq: false }, active: { _eq: true } }
      order_by: { name: asc }
    ) {
      id
      name
      sku
      base_price
      unit
    }
  }
`;
