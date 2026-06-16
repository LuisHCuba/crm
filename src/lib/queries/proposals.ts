import { gql } from "graphql-request";

/* ------------------------------------------------------------------ */
/*  Propostas                                                          */
/* ------------------------------------------------------------------ */

export interface Proposal {
  id: string;
  title: string;
  content: string;
  password: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

/** Resumo para a listagem (não traz o conteúdo nem a senha em claro). */
export interface ProposalListItem {
  id: string;
  title: string;
  archived: boolean;
  created_at: string;
  updated_at: string;
  has_password: boolean;
}

/** Lista de propostas (gestão). Indica apenas se há senha, não a senha em si. */
export const PROPOSALS_LIST = gql`
  query ProposalsList {
    proposals(
      where: { archived: { _eq: false } }
      order_by: { updated_at: desc }
    ) {
      id
      title
      archived
      created_at
      updated_at
      password
    }
  }
`;

/** Proposta completa por id (inclui conteúdo e senha — usada na edição). */
export const PROPOSAL_BY_ID = gql`
  query ProposalById($id: uuid!) {
    proposals_by_pk(id: $id) {
      id
      title
      content
      password
      archived
      created_at
      updated_at
    }
  }
`;

/**
 * Versão pública por id (rota /p/:id). Traz conteúdo e senha porque a
 * comparação da senha é feita no cliente — segurança simples, conforme pedido.
 */
export const PUBLIC_PROPOSAL_BY_ID = gql`
  query PublicProposalById($id: uuid!) {
    proposals_by_pk(id: $id) {
      id
      title
      content
      password
      archived
    }
  }
`;

export const CREATE_PROPOSAL = gql`
  mutation CreateProposal($obj: proposals_insert_input!) {
    insert_proposals_one(object: $obj) {
      id
    }
  }
`;

export const UPDATE_PROPOSAL = gql`
  mutation UpdateProposal($id: uuid!, $set: proposals_set_input!) {
    update_proposals_by_pk(pk_columns: { id: $id }, _set: $set) {
      id
    }
  }
`;

export const ARCHIVE_PROPOSAL = gql`
  mutation ArchiveProposal($id: uuid!) {
    update_proposals_by_pk(
      pk_columns: { id: $id }
      _set: { archived: true }
    ) {
      id
    }
  }
`;
