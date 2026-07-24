import { gql } from "graphql-request";
import { gqlClient } from "./graphql";
import { formatCurrency } from "./format";

/* ------------------------------------------------------------------ */
/*  Busca de entidades no servidor (escalável)                         */
/*                                                                     */
/*  Todos os seletores de registros usam estas funções: a busca roda   */
/*  no Hasura com ilike + limite, nunca carregando a tabela inteira    */
/*  no navegador. Query vazia retorna os 20 mais recentes/relevantes.  */
/* ------------------------------------------------------------------ */

export interface SearchOption {
  id: string;
  label: string;
  sub?: string | null;
  /** Dados extras do registro (ex.: preço do produto). */
  meta?: Record<string, unknown>;
}

const SEARCH_CONTACTS = gql`
  query SearchContactsOpts($q: String!, $exclude: [uuid!]!) {
    contacts(
      where: {
        archived: { _eq: false }
        id: { _nin: $exclude }
        _or: [{ full_name: { _ilike: $q } }, { email: { _ilike: $q } }]
      }
      order_by: { full_name: asc }
      limit: 20
    ) {
      id
      full_name
      email
    }
  }
`;

export async function searchContacts(
  q: string,
  excludeIds: string[] = []
): Promise<SearchOption[]> {
  const res = await gqlClient.request<{
    contacts: { id: string; full_name: string; email: string | null }[];
  }>(SEARCH_CONTACTS, { q: `%${q}%`, exclude: excludeIds });
  return res.contacts.map((c) => ({
    id: c.id,
    label: c.full_name,
    sub: c.email,
  }));
}

const SEARCH_COMPANIES = gql`
  query SearchCompaniesOpts($q: String!, $exclude: [uuid!]!) {
    companies(
      where: {
        archived: { _eq: false }
        id: { _nin: $exclude }
        _or: [{ legal_name: { _ilike: $q } }, { trade_name: { _ilike: $q } }]
      }
      order_by: { legal_name: asc }
      limit: 20
    ) {
      id
      legal_name
      trade_name
    }
  }
`;

export async function searchCompanies(
  q: string,
  excludeIds: string[] = []
): Promise<SearchOption[]> {
  const res = await gqlClient.request<{
    companies: { id: string; legal_name: string; trade_name: string | null }[];
  }>(SEARCH_COMPANIES, { q: `%${q}%`, exclude: excludeIds });
  return res.companies.map((c) => ({
    id: c.id,
    label: c.trade_name || c.legal_name,
    sub: c.trade_name ? c.legal_name : null,
  }));
}

const SEARCH_DEALS = gql`
  query SearchDealsOpts($q: String!, $exclude: [uuid!]!) {
    deals(
      where: {
        archived: { _eq: false }
        id: { _nin: $exclude }
        title: { _ilike: $q }
      }
      order_by: { created_at: desc }
      limit: 20
    ) {
      id
      title
      total_value
    }
  }
`;

export async function searchDeals(
  q: string,
  excludeIds: string[] = []
): Promise<SearchOption[]> {
  const res = await gqlClient.request<{
    deals: { id: string; title: string; total_value: string | null }[];
  }>(SEARCH_DEALS, { q: `%${q}%`, exclude: excludeIds });
  return res.deals.map((d) => ({
    id: d.id,
    label: d.title,
    sub: d.total_value != null ? formatCurrency(d.total_value) : null,
  }));
}

const SEARCH_PROPOSALS_UNLINKED = gql`
  query SearchProposalsUnlinkedOpts($q: String!) {
    proposals(
      where: {
        archived: { _eq: false }
        deal_id: { _is_null: true }
        title: { _ilike: $q }
      }
      order_by: { updated_at: desc }
      limit: 20
    ) {
      id
      title
    }
  }
`;

/** Propostas ativas ainda sem negócio (para vincular a um negócio). */
export async function searchProposalsUnlinked(
  q: string
): Promise<SearchOption[]> {
  const res = await gqlClient.request<{
    proposals: { id: string; title: string }[];
  }>(SEARCH_PROPOSALS_UNLINKED, { q: `%${q}%` });
  return res.proposals.map((p) => ({ id: p.id, label: p.title }));
}

const CONTACT_OPTION_BY_PK = gql`
  query ContactOptionByPk($id: uuid!) {
    contacts_by_pk(id: $id) {
      id
      full_name
      email
    }
  }
`;

/** Rótulo de um contato já selecionado (ex.: edição de registro). */
export async function fetchContactOption(
  id: string
): Promise<SearchOption | null> {
  const res = await gqlClient.request<{
    contacts_by_pk: {
      id: string;
      full_name: string;
      email: string | null;
    } | null;
  }>(CONTACT_OPTION_BY_PK, { id });
  const c = res.contacts_by_pk;
  return c ? { id: c.id, label: c.full_name, sub: c.email } : null;
}

const COMPANY_OPTION_BY_PK = gql`
  query CompanyOptionByPk($id: uuid!) {
    companies_by_pk(id: $id) {
      id
      legal_name
      trade_name
    }
  }
`;

/** Rótulo de uma empresa já selecionada (ex.: edição de registro). */
export async function fetchCompanyOption(
  id: string
): Promise<SearchOption | null> {
  const res = await gqlClient.request<{
    companies_by_pk: {
      id: string;
      legal_name: string;
      trade_name: string | null;
    } | null;
  }>(COMPANY_OPTION_BY_PK, { id });
  const c = res.companies_by_pk;
  return c ? { id: c.id, label: c.trade_name || c.legal_name } : null;
}

const DEAL_OPTION_BY_PK = gql`
  query DealOptionByPk($id: uuid!) {
    deals_by_pk(id: $id) {
      id
      title
    }
  }
`;

/** Rótulo de um negócio já selecionado (ex.: edição de registro). */
export async function fetchDealOption(
  id: string
): Promise<SearchOption | null> {
  const res = await gqlClient.request<{
    deals_by_pk: { id: string; title: string } | null;
  }>(DEAL_OPTION_BY_PK, { id });
  const d = res.deals_by_pk;
  return d ? { id: d.id, label: d.title } : null;
}

const SEARCH_PRODUCTS = gql`
  query SearchProductsOpts($q: String!) {
    products(
      where: {
        archived: { _eq: false }
        active: { _eq: true }
        _or: [{ name: { _ilike: $q } }, { sku: { _ilike: $q } }]
      }
      order_by: { name: asc }
      limit: 20
    ) {
      id
      name
      sku
      base_price
      unit
    }
  }
`;

const PRODUCT_OPTION_BY_PK = gql`
  query ProductOptionByPk($id: uuid!) {
    products_by_pk(id: $id) {
      id
      name
      sku
      base_price
      unit
    }
  }
`;

/** Rótulo/dados de um produto já selecionado (ex.: recém-criado). */
export async function fetchProductOption(
  id: string
): Promise<SearchOption | null> {
  const res = await gqlClient.request<{
    products_by_pk: {
      id: string;
      name: string;
      sku: string | null;
      base_price: string | null;
      unit: string;
    } | null;
  }>(PRODUCT_OPTION_BY_PK, { id });
  const p = res.products_by_pk;
  return p
    ? {
        id: p.id,
        label: p.name,
        sub: p.sku,
        meta: { base_price: p.base_price, unit: p.unit },
      }
    : null;
}

export async function searchProducts(q: string): Promise<SearchOption[]> {
  const res = await gqlClient.request<{
    products: {
      id: string;
      name: string;
      sku: string | null;
      base_price: string | null;
      unit: string;
    }[];
  }>(SEARCH_PRODUCTS, { q: `%${q}%` });
  return res.products.map((p) => ({
    id: p.id,
    label: p.name,
    sub: p.sku,
    meta: { base_price: p.base_price, unit: p.unit },
  }));
}
