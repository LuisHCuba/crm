import { gql } from "graphql-request";

// ===================== Tipos =====================
export interface RefCategory {
  id: string;
  name: string;
  type: "revenue" | "expense";
  active: boolean;
}
export interface RefCostCenter {
  id: string;
  name: string;
  code: string | null;
  active: boolean;
}
export interface RefBankAccount {
  id: string;
  name: string;
  bank_name: string | null;
  branch_account: string | null;
  account_type: string;
  initial_balance: string | null;
  active: boolean;
}
export interface RefDeal {
  id: string;
  title: string;
}
export interface RefCompany {
  id: string;
  trade_name: string | null;
  legal_name: string | null;
}
export interface RefContact {
  id: string;
  full_name: string;
}

export interface Apportionment {
  id?: string;
  category_id: string | null;
  cost_center_id: string | null;
  percentage: number | null;
  value: number;
  category?: { name: string } | null;
  cost_center?: { name: string } | null;
}

export interface Entry {
  id: string;
  description: string;
  value: string;
  due_date: string;
  status: string;
  payment_date: string | null;
  parcel_label: string | null;
  parcel_group: string | null;
  notes: string | null;
  reconciled: boolean;
  category_id: string | null;
  bank_account_id: string | null;
  cost_center_id: string | null;
  company_id: string | null;
  deal_id: string | null;
  contact_id: string | null;
  category?: { id: string; name: string } | null;
  bank_account?: { id: string; name: string } | null;
  cost_center?: { id: string; name: string } | null;
  apportionments: Apportionment[];
}
export interface Payable extends Entry {
  supplier_name: string | null;
  paid_value: string | null;
}
export interface Receivable extends Entry {
  payer_name: string | null;
  received_value: string | null;
  product_id: string | null;
  deal?: { id: string; title: string } | null;
}

export interface BankAccount extends RefBankAccount {
  created_at: string;
}
export interface BankTransaction {
  id: string;
  bank_account_id: string;
  date: string;
  description: string;
  amount: string;
  kind: string;
  reconciled: boolean;
  reconciled_at: string | null;
  payable_id: string | null;
  receivable_id: string | null;
  transfer_group: string | null;
  memo: string | null;
  payable?: { id: string; description: string } | null;
  receivable?: { id: string; description: string } | null;
}
export interface Recurrence {
  id: string;
  kind: "payable" | "receivable";
  description: string;
  value: string;
  frequency: string;
  start_date: string;
  next_run_date: string;
  occurrences_total: number | null;
  occurrences_generated: number;
  active: boolean;
  category_id: string | null;
  cost_center_id: string | null;
  bank_account_id: string | null;
  company_id: string | null;
  deal_id: string | null;
  category?: { name: string } | null;
  bank_account?: { name: string } | null;
  cost_center?: { name: string } | null;
}

// ===================== Fragmentos de campos =====================
const ENTRY_FIELDS = `
  id description value due_date status payment_date parcel_label parcel_group
  notes reconciled category_id bank_account_id cost_center_id company_id
  deal_id contact_id
  category { id name } bank_account { id name } cost_center { id name }
  apportionments { id category_id cost_center_id percentage value category { name } cost_center { name } }
`;

// ===================== Dados de referência =====================
export const FIN_REFERENCE_QUERY = gql`
  query FinReference {
    financial_categories(where: { archived: { _eq: false } }, order_by: { name: asc }) {
      id name type active
    }
    cost_centers(where: { archived: { _eq: false } }, order_by: { name: asc }) {
      id name code active
    }
    bank_accounts(where: { archived: { _eq: false } }, order_by: { name: asc }) {
      id name bank_name branch_account account_type initial_balance active
    }
    deals(where: { archived: { _eq: false } }, order_by: { title: asc }) {
      id title
    }
    companies(where: { archived: { _eq: false } }, order_by: { trade_name: asc }) {
      id trade_name legal_name
    }
    contacts(where: { archived: { _eq: false } }, order_by: { full_name: asc }) {
      id full_name
    }
  }
`;

// ===================== Vínculos com o CRM (record pages) =====================
export interface FinanceLinkEntry {
  id: string;
  description: string;
  value: string;
  due_date: string;
  status: string;
  payment_date: string | null;
}

/**
 * Lançamentos (a receber e a pagar) vinculados a um objeto do CRM
 * (contato/empresa/negócio). O `where` é montado no cliente.
 */
export const FINANCE_LINKS_QUERY = gql`
  query FinanceLinks(
    $recWhere: receivables_bool_exp!
    $payWhere: payables_bool_exp!
  ) {
    receivables(where: $recWhere, order_by: { due_date: asc }) {
      id description value due_date status payment_date
    }
    payables(where: $payWhere, order_by: { due_date: asc }) {
      id description value due_date status payment_date
    }
  }
`;

// ===================== Contas a Pagar =====================
export const PAYABLES_QUERY = gql`
  query Payables {
    payables(where: { archived: { _eq: false } }, order_by: { due_date: asc }) {
      ${ENTRY_FIELDS}
      supplier_name paid_value
    }
  }
`;
export const INSERT_PAYABLE = gql`
  mutation InsertPayable($obj: payables_insert_input!) {
    insert_payables_one(object: $obj) { id }
  }
`;
export const UPDATE_PAYABLE = gql`
  mutation UpdatePayable($id: uuid!, $set: payables_set_input!) {
    update_payables_by_pk(pk_columns: { id: $id }, _set: $set) { id }
  }
`;
export const ARCHIVE_PAYABLE = gql`
  mutation ArchivePayable($id: uuid!) {
    update_payables_by_pk(pk_columns: { id: $id }, _set: { archived: true }) { id }
  }
`;

// ===================== Contas a Receber =====================
export const RECEIVABLES_FIN_QUERY = gql`
  query ReceivablesFin {
    receivables(where: { archived: { _eq: false } }, order_by: { due_date: asc }) {
      ${ENTRY_FIELDS}
      payer_name received_value product_id
      deal { id title }
    }
  }
`;
export const INSERT_RECEIVABLE = gql`
  mutation InsertReceivable($obj: receivables_insert_input!) {
    insert_receivables_one(object: $obj) { id }
  }
`;
export const UPDATE_RECEIVABLE = gql`
  mutation UpdateReceivable($id: uuid!, $set: receivables_set_input!) {
    update_receivables_by_pk(pk_columns: { id: $id }, _set: $set) { id }
  }
`;
export const ARCHIVE_RECEIVABLE = gql`
  mutation ArchiveReceivable($id: uuid!) {
    update_receivables_by_pk(pk_columns: { id: $id }, _set: { archived: true }) { id }
  }
`;

// ===================== Rateio (apportionment) =====================
export const DELETE_APPORTIONMENTS_PAYABLE = gql`
  mutation DelAppPayable($id: uuid!) {
    delete_apportionments(where: { payable_id: { _eq: $id } }) { affected_rows }
  }
`;
export const DELETE_APPORTIONMENTS_RECEIVABLE = gql`
  mutation DelAppReceivable($id: uuid!) {
    delete_apportionments(where: { receivable_id: { _eq: $id } }) { affected_rows }
  }
`;
export const INSERT_APPORTIONMENTS = gql`
  mutation InsertApportionments($objs: [apportionments_insert_input!]!) {
    insert_apportionments(objects: $objs) { affected_rows }
  }
`;

// ===================== Contas bancárias / extrato =====================
export const BANK_ACCOUNTS_QUERY = gql`
  query BankAccounts {
    bank_accounts(where: { archived: { _eq: false } }, order_by: { name: asc }) {
      id name bank_name branch_account account_type initial_balance active created_at
      transactions_aggregate: bank_transactions_aggregate {
        aggregate { sum { amount } count }
      }
    }
  }
`;
export const BANK_TRANSACTIONS_QUERY = gql`
  query BankTransactions($accountId: uuid!) {
    bank_transactions(
      where: { bank_account_id: { _eq: $accountId }, archived: { _eq: false } }
      order_by: { date: desc, created_at: desc }
    ) {
      id bank_account_id date description amount kind reconciled reconciled_at
      payable_id receivable_id transfer_group memo
      payable { id description }
      receivable { id description }
    }
  }
`;
export const INSERT_BANK_ACCOUNT = gql`
  mutation InsertBankAccount($obj: bank_accounts_insert_input!) {
    insert_bank_accounts_one(object: $obj) { id }
  }
`;
export const UPDATE_BANK_ACCOUNT = gql`
  mutation UpdateBankAccount($id: uuid!, $set: bank_accounts_set_input!) {
    update_bank_accounts_by_pk(pk_columns: { id: $id }, _set: $set) { id }
  }
`;
export const ARCHIVE_BANK_ACCOUNT = gql`
  mutation ArchiveBankAccount($id: uuid!) {
    update_bank_accounts_by_pk(pk_columns: { id: $id }, _set: { archived: true }) { id }
  }
`;
export const INSERT_BANK_TRANSACTIONS = gql`
  mutation InsertBankTransactions($objs: [bank_transactions_insert_input!]!) {
    insert_bank_transactions(objects: $objs) { affected_rows returning { id } }
  }
`;
export const UPDATE_BANK_TRANSACTION = gql`
  mutation UpdateBankTransaction($id: uuid!, $set: bank_transactions_set_input!) {
    update_bank_transactions_by_pk(pk_columns: { id: $id }, _set: $set) { id }
  }
`;
export const DELETE_BANK_TRANSACTION = gql`
  mutation DeleteBankTransaction($id: uuid!) {
    update_bank_transactions_by_pk(pk_columns: { id: $id }, _set: { archived: true }) { id }
  }
`;

// ===================== Recorrências =====================
export const RECURRENCES_QUERY = gql`
  query Recurrences {
    recurrences(where: { archived: { _eq: false } }, order_by: { next_run_date: asc }) {
      id kind description value frequency start_date next_run_date
      occurrences_total occurrences_generated active
      category_id cost_center_id bank_account_id company_id deal_id
      category { name } bank_account { name } cost_center { name }
    }
  }
`;
export const INSERT_RECURRENCE = gql`
  mutation InsertRecurrence($obj: recurrences_insert_input!) {
    insert_recurrences_one(object: $obj) { id }
  }
`;
export const UPDATE_RECURRENCE = gql`
  mutation UpdateRecurrence($id: uuid!, $set: recurrences_set_input!) {
    update_recurrences_by_pk(pk_columns: { id: $id }, _set: $set) { id }
  }
`;
export const ARCHIVE_RECURRENCE = gql`
  mutation ArchiveRecurrence($id: uuid!) {
    update_recurrences_by_pk(pk_columns: { id: $id }, _set: { archived: true }) { id }
  }
`;

// ===================== Categorias =====================
export const INSERT_CATEGORY = gql`
  mutation InsertCategory($obj: financial_categories_insert_input!) {
    insert_financial_categories_one(object: $obj) { id }
  }
`;
export const UPDATE_CATEGORY = gql`
  mutation UpdateCategory($id: uuid!, $set: financial_categories_set_input!) {
    update_financial_categories_by_pk(pk_columns: { id: $id }, _set: $set) { id }
  }
`;
export const ARCHIVE_CATEGORY = gql`
  mutation ArchiveCategory($id: uuid!) {
    update_financial_categories_by_pk(pk_columns: { id: $id }, _set: { archived: true }) { id }
  }
`;

// ===================== Centros de custo =====================
export const INSERT_COST_CENTER = gql`
  mutation InsertCostCenter($obj: cost_centers_insert_input!) {
    insert_cost_centers_one(object: $obj) { id }
  }
`;
export const UPDATE_COST_CENTER = gql`
  mutation UpdateCostCenter($id: uuid!, $set: cost_centers_set_input!) {
    update_cost_centers_by_pk(pk_columns: { id: $id }, _set: $set) { id }
  }
`;
export const ARCHIVE_COST_CENTER = gql`
  mutation ArchiveCostCenter($id: uuid!) {
    update_cost_centers_by_pk(pk_columns: { id: $id }, _set: { archived: true }) { id }
  }
`;
