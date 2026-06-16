import { gql } from "graphql-request";

/* ------------------------------------------------------------------ */
/*  Tipos compartilhados                                               */
/* ------------------------------------------------------------------ */

export type ContactStage = "new" | "qualified" | "active_client" | "inactive";
export type ContactOrigin = "website" | "referral" | "event" | "other";
export type CompanyType = "client" | "supplier" | "both";
export type DealLossReason =
  | "price"
  | "competition"
  | "timing"
  | "no_response"
  | "other";
export type StageType = "open" | "won" | "lost";
export type ActivityType =
  | "reminder"
  | "note"
  | "call"
  | "meeting"
  | "email"
  | "system";

export interface UserRef {
  id: string;
  name: string;
  avatar_url?: string | null;
}

export interface CompanyRef {
  id: string;
  legal_name: string;
  trade_name: string | null;
}

export interface ContactRef {
  id: string;
  full_name: string;
  email: string | null;
}

export interface Activity {
  id: string;
  type: ActivityType;
  title: string | null;
  body: string | null;
  created_at: string;
  created_by?: UserRef | null;
  call_result?: string | null;
  call_duration_minutes?: number | null;
  meeting_date?: string | null;
  reminder_due_date?: string | null;
}

export interface Contact {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  stage: ContactStage;
  origin: ContactOrigin | null;
  created_at: string;
  responsible?: UserRef | null;
  contact_companies?: { company: CompanyRef }[];
  deal_contacts?: { deal: Deal }[];
  activities?: Activity[];
}

export interface Company {
  id: string;
  legal_name: string;
  trade_name: string | null;
  document: string;
  type: CompanyType;
  phone: string | null;
  email: string | null;
  address: string | null;
  created_at: string;
  responsible?: UserRef | null;
  contact_companies?: { contact: ContactRef }[];
  deals?: Deal[];
  activities?: Activity[];
}

export interface Stage {
  id: string;
  name: string;
  order: number;
  type: StageType;
  pipeline_id: string;
  probability?: number | null;
}

/** Negócio enxuto usado nas visões de lista (quadro e tabela). */
export interface DealListItem {
  id: string;
  title: string;
  total_value: string | null;
  forecast_date: string | null;
  closed_at: string | null;
  created_at: string;
  pipeline_id: string;
  stage_id: string;
  loss_reason: DealLossReason | null;
  responsible?: UserRef | null;
  company?: CompanyRef | null;
  stage?: { id: string; name: string; type: StageType } | null;
  line_items_aggregate?: { aggregate: { count: number } | null } | null;
}

export interface Pipeline {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  base_price: string;
  unit: string;
  active: boolean;
  created_at: string;
}

export interface LineItem {
  id: string;
  deal_id: string;
  product_id: string;
  quantity: number;
  unit_price: string;
  discount_percent: string | null;
  subtotal: string;
  product?: { id: string; name: string; sku: string | null; unit: string };
}

export interface Deal {
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
  stage?: Stage | null;
  pipeline?: Pipeline | null;
  company?: CompanyRef | null;
  responsible?: UserRef | null;
  deal_contacts?: { contact: ContactRef }[];
  line_items?: LineItem[];
  activities?: Activity[];
}

/* ------------------------------------------------------------------ */
/*  Usuários (somente leitura — para seletor de responsável)          */
/* ------------------------------------------------------------------ */

export const USERS_LIST = gql`
  query UsersList {
    users(where: { archived: { _eq: false } }, order_by: { name: asc }) {
      id
      name
      avatar_url
    }
  }
`;

/* ------------------------------------------------------------------ */
/*  Contatos                                                           */
/* ------------------------------------------------------------------ */

export const CONTACTS_LIST = gql`
  query ContactsList {
    contacts(
      where: { archived: { _eq: false } }
      order_by: { created_at: desc }
    ) {
      id
      full_name
      email
      phone
      job_title
      stage
      origin
      created_at
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
      deal_contacts_aggregate {
        aggregate {
          count
        }
      }
    }
  }
`;

/**
 * Lista paginada e filtrável de contatos (estilo HubSpot).
 * `where` é montado no cliente (contacts_bool_exp) e cobre busca + filtros.
 * Retorna a página atual + a contagem total já filtrada (para paginação).
 */
export const CONTACTS_PAGE = gql`
  query ContactsPage(
    $where: contacts_bool_exp!
    $limit: Int!
    $offset: Int!
    $order_by: [contacts_order_by!]
  ) {
    contacts(
      where: $where
      limit: $limit
      offset: $offset
      order_by: $order_by
    ) {
      id
      full_name
      email
      phone
      job_title
      stage
      origin
      created_at
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
    }
    filtered: contacts_aggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`;

/** Contagens dos cabeçalhos das abas de visão. */
export const CONTACTS_VIEW_COUNTS = gql`
  query ContactsViewCounts($me: uuid!) {
    all: contacts_aggregate(where: { archived: { _eq: false } }) {
      aggregate {
        count
      }
    }
    mine: contacts_aggregate(
      where: { archived: { _eq: false }, responsible_id: { _eq: $me } }
    ) {
      aggregate {
        count
      }
    }
    unassigned: contacts_aggregate(
      where: { archived: { _eq: false }, responsible_id: { _is_null: true } }
    ) {
      aggregate {
        count
      }
    }
  }
`;

/** Arquivamento em massa de contatos. */
export const ARCHIVE_CONTACTS_BULK = gql`
  mutation ArchiveContactsBulk($ids: [uuid!]!) {
    update_contacts(
      where: { id: { _in: $ids } }
      _set: { archived: true }
    ) {
      affected_rows
    }
  }
`;

/** Atribuição em massa de responsável. */
export const ASSIGN_CONTACTS_BULK = gql`
  mutation AssignContactsBulk($ids: [uuid!]!, $responsible_id: uuid) {
    update_contacts(
      where: { id: { _in: $ids } }
      _set: { responsible_id: $responsible_id }
    ) {
      affected_rows
    }
  }
`;

export const CONTACT_DETAIL = gql`
  query ContactDetail($id: uuid!) {
    contacts_by_pk(id: $id) {
      id
      full_name
      email
      phone
      job_title
      stage
      origin
      created_at
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
        created_by {
          id
          name
        }
      }
    }
  }
`;

export const CREATE_CONTACT_FULL = gql`
  mutation CreateContactFull($obj: contacts_insert_input!) {
    insert_contacts_one(object: $obj) {
      id
    }
  }
`;

export const UPDATE_CONTACT_FULL = gql`
  mutation UpdateContactFull($id: uuid!, $set: contacts_set_input!) {
    update_contacts_by_pk(pk_columns: { id: $id }, _set: $set) {
      id
    }
  }
`;

export const ARCHIVE_CONTACT = gql`
  mutation ArchiveContact($id: uuid!) {
    update_contacts_by_pk(
      pk_columns: { id: $id }
      _set: { archived: true }
    ) {
      id
    }
  }
`;

/**
 * Promove contatos para "Cliente ativo" (usado quando um negócio é ganho —
 * automação de ciclo de vida estilo HubSpot). Só altera quem ainda não é
 * cliente ativo e devolve os ids efetivamente alterados (para auditoria).
 */
export const SET_CONTACTS_ACTIVE_CLIENT = gql`
  mutation SetContactsActiveClient($ids: [uuid!]!) {
    update_contacts(
      where: { id: { _in: $ids }, stage: { _neq: active_client } }
      _set: { stage: active_client }
    ) {
      affected_rows
      returning {
        id
      }
    }
  }
`;

/**
 * Promove para "Cliente ativo" todos os contatos vinculados a um negócio
 * (usa o relacionamento deal_contacts). Útil ao ganhar pelo quadro, onde os
 * contatos não estão carregados no card.
 */
export const PROMOTE_DEAL_CONTACTS_ACTIVE_CLIENT = gql`
  mutation PromoteDealContactsActiveClient($dealId: uuid!) {
    update_contacts(
      where: {
        deal_contacts: { deal_id: { _eq: $dealId } }
        stage: { _neq: active_client }
      }
      _set: { stage: active_client }
    ) {
      affected_rows
      returning {
        id
      }
    }
  }
`;

/* ------------------------------------------------------------------ */
/*  Empresas                                                           */
/* ------------------------------------------------------------------ */

export const COMPANIES_LIST = gql`
  query CompaniesList {
    companies(
      where: { archived: { _eq: false } }
      order_by: { created_at: desc }
    ) {
      id
      legal_name
      trade_name
      document
      type
      phone
      email
      created_at
      responsible {
        id
        name
        avatar_url
      }
      contact_companies_aggregate {
        aggregate {
          count
        }
      }
      deals_aggregate(where: { archived: { _eq: false } }) {
        aggregate {
          count
        }
      }
    }
  }
`;

export const COMPANY_DETAIL = gql`
  query CompanyDetail($id: uuid!) {
    companies_by_pk(id: $id) {
      id
      legal_name
      trade_name
      document
      type
      phone
      email
      address
      created_at
      responsible {
        id
        name
        avatar_url
      }
      contact_companies {
        contact {
          id
          full_name
          email
          job_title
        }
      }
      deals(where: { archived: { _eq: false } }, order_by: { created_at: desc }) {
        id
        title
        total_value
        stage {
          id
          name
          type
        }
      }
      activities(order_by: { created_at: desc }) {
        id
        type
        title
        body
        created_at
        created_by {
          id
          name
        }
      }
    }
  }
`;

export const CREATE_COMPANY = gql`
  mutation CreateCompany($obj: companies_insert_input!) {
    insert_companies_one(object: $obj) {
      id
    }
  }
`;

export const UPDATE_COMPANY = gql`
  mutation UpdateCompany($id: uuid!, $set: companies_set_input!) {
    update_companies_by_pk(pk_columns: { id: $id }, _set: $set) {
      id
    }
  }
`;

export const ARCHIVE_COMPANY = gql`
  mutation ArchiveCompany($id: uuid!) {
    update_companies_by_pk(
      pk_columns: { id: $id }
      _set: { archived: true }
    ) {
      id
    }
  }
`;

/* ------------------------------------------------------------------ */
/*  Negócios (Deals)                                                   */
/* ------------------------------------------------------------------ */

export const DEALS_BOARD = gql`
  query DealsBoard {
    deals(
      where: { archived: { _eq: false } }
      order_by: { created_at: desc }
    ) {
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
      company {
        id
        legal_name
        trade_name
      }
      responsible {
        id
        name
        avatar_url
      }
      deal_contacts {
        contact {
          id
          full_name
          email
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
      order
      type
      pipeline_id
    }
  }
`;

export const DEAL_DETAIL = gql`
  query DealDetail($id: uuid!) {
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
      stage {
        id
        name
        type
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
      responsible {
        id
        name
        avatar_url
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
        deal_id
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
      activities(order_by: { created_at: desc }) {
        id
        type
        title
        body
        created_at
        created_by {
          id
          name
        }
      }
    }
    pipeline_stages(order_by: { order: asc }) {
      id
      name
      order
      type
      pipeline_id
    }
  }
`;

export const PIPELINES_WITH_STAGES = gql`
  query PipelinesWithStages {
    pipelines(where: { archived: { _eq: false } }, order_by: { name: asc }) {
      id
      name
    }
    pipeline_stages(order_by: { order: asc }) {
      id
      name
      order
      type
      pipeline_id
    }
  }
`;

export const CREATE_DEAL = gql`
  mutation CreateDeal($obj: deals_insert_input!) {
    insert_deals_one(object: $obj) {
      id
    }
  }
`;

export const UPDATE_DEAL = gql`
  mutation UpdateDeal($id: uuid!, $set: deals_set_input!) {
    update_deals_by_pk(pk_columns: { id: $id }, _set: $set) {
      id
      stage_id
      total_value
      loss_reason
      closed_at
    }
  }
`;

export const ARCHIVE_DEAL = gql`
  mutation ArchiveDeal($id: uuid!) {
    update_deals_by_pk(pk_columns: { id: $id }, _set: { archived: true }) {
      id
    }
  }
`;

/* ------------------------------------------------------------------ */
/*  Listagem de negócios (visões Quadro/Tabela estilo HubSpot)        */
/* ------------------------------------------------------------------ */

/** Pipelines + etapas (com probabilidade) para montar colunas do quadro. */
export const DEAL_BOARD_META = gql`
  query DealBoardMeta {
    pipelines(where: { archived: { _eq: false } }, order_by: { name: asc }) {
      id
      name
    }
    pipeline_stages(order_by: { order: asc }) {
      id
      name
      order
      type
      pipeline_id
      probability
    }
  }
`;

/** Negócios de um pipeline (quadro). `where` é montado no cliente. */
export const DEALS_BY_PIPELINE = gql`
  query DealsByPipeline($where: deals_bool_exp!, $limit: Int!) {
    deals(where: $where, order_by: { created_at: desc }, limit: $limit) {
      id
      title
      total_value
      forecast_date
      closed_at
      created_at
      pipeline_id
      stage_id
      loss_reason
      responsible {
        id
        name
        avatar_url
      }
      company {
        id
        legal_name
        trade_name
      }
      line_items_aggregate {
        aggregate {
          count
        }
      }
    }
  }
`;

/** Página filtrável da tabela + contagem total já filtrada (paginação). */
export const DEALS_PAGE = gql`
  query DealsPage(
    $where: deals_bool_exp!
    $limit: Int!
    $offset: Int!
    $order_by: [deals_order_by!]
  ) {
    deals(where: $where, limit: $limit, offset: $offset, order_by: $order_by) {
      id
      title
      total_value
      forecast_date
      closed_at
      created_at
      pipeline_id
      stage_id
      loss_reason
      responsible {
        id
        name
        avatar_url
      }
      company {
        id
        legal_name
        trade_name
      }
      stage {
        id
        name
        type
      }
      line_items_aggregate {
        aggregate {
          count
        }
      }
    }
    filtered: deals_aggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`;

/** Contagem total de negócios não arquivados (cabeçalho da aba). */
export const DEALS_TOTAL_COUNT = gql`
  query DealsTotalCount {
    deals_aggregate(where: { archived: { _eq: false } }) {
      aggregate {
        count
      }
    }
  }
`;

/** Arquivamento em massa de negócios. */
export const ARCHIVE_DEALS_BULK = gql`
  mutation ArchiveDealsBulk($ids: [uuid!]!) {
    update_deals(where: { id: { _in: $ids } }, _set: { archived: true }) {
      affected_rows
    }
  }
`;

/* ------------------------------------------------------------------ */
/*  Produtos                                                           */
/* ------------------------------------------------------------------ */

export const PRODUCTS_LIST = gql`
  query ProductsList {
    products(
      where: { archived: { _eq: false } }
      order_by: { created_at: desc }
    ) {
      id
      name
      sku
      description
      base_price
      unit
      active
      created_at
    }
  }
`;

export const CREATE_PRODUCT = gql`
  mutation CreateProduct($obj: products_insert_input!) {
    insert_products_one(object: $obj) {
      id
    }
  }
`;

export const UPDATE_PRODUCT = gql`
  mutation UpdateProduct($id: uuid!, $set: products_set_input!) {
    update_products_by_pk(pk_columns: { id: $id }, _set: $set) {
      id
    }
  }
`;

export const ARCHIVE_PRODUCT = gql`
  mutation ArchiveProduct($id: uuid!) {
    update_products_by_pk(
      pk_columns: { id: $id }
      _set: { archived: true }
    ) {
      id
    }
  }
`;

/* ------------------------------------------------------------------ */
/*  Itens de linha (line items)                                        */
/* ------------------------------------------------------------------ */

export const ADD_LINE_ITEM = gql`
  mutation AddLineItem($obj: deal_line_items_insert_input!) {
    insert_deal_line_items_one(object: $obj) {
      id
    }
  }
`;

export const UPDATE_LINE_ITEM = gql`
  mutation UpdateLineItem($id: uuid!, $set: deal_line_items_set_input!) {
    update_deal_line_items_by_pk(pk_columns: { id: $id }, _set: $set) {
      id
    }
  }
`;

export const DELETE_LINE_ITEM = gql`
  mutation DeleteLineItem($id: uuid!) {
    delete_deal_line_items_by_pk(id: $id) {
      id
    }
  }
`;

/* ------------------------------------------------------------------ */
/*  Associações                                                        */
/* ------------------------------------------------------------------ */

export const LINK_CONTACT_COMPANY = gql`
  mutation LinkContactCompany($contact_id: uuid!, $company_id: uuid!) {
    insert_contact_companies_one(
      object: { contact_id: $contact_id, company_id: $company_id }
    ) {
      contact_id
    }
  }
`;

export const UNLINK_CONTACT_COMPANY = gql`
  mutation UnlinkContactCompany($contact_id: uuid!, $company_id: uuid!) {
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

export const LINK_DEAL_CONTACT = gql`
  mutation LinkDealContact($deal_id: uuid!, $contact_id: uuid!) {
    insert_deal_contacts_one(
      object: { deal_id: $deal_id, contact_id: $contact_id }
      on_conflict: { constraint: deal_contacts_pk, update_columns: [] }
    ) {
      deal_id
    }
  }
`;

export const UNLINK_DEAL_CONTACT = gql`
  mutation UnlinkDealContact($deal_id: uuid!, $contact_id: uuid!) {
    delete_deal_contacts(
      where: { deal_id: { _eq: $deal_id }, contact_id: { _eq: $contact_id } }
    ) {
      affected_rows
    }
  }
`;

/* ------------------------------------------------------------------ */
/*  Atividades (timeline)                                              */
/* ------------------------------------------------------------------ */

export const CREATE_ACTIVITY = gql`
  mutation CreateActivity($obj: activities_insert_input!) {
    insert_activities_one(object: $obj) {
      id
    }
  }
`;

/* Listas auxiliares para seletores de associação */
export const CONTACTS_MINI = gql`
  query ContactsMini {
    contacts(
      where: { archived: { _eq: false } }
      order_by: { full_name: asc }
    ) {
      id
      full_name
      email
    }
  }
`;

export const COMPANIES_MINI = gql`
  query CompaniesMini {
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

export const PRODUCTS_MINI = gql`
  query ProductsMini {
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
