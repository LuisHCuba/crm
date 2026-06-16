import { useQuery } from "@tanstack/react-query";
import { gqlClient } from "../../lib/graphql";
import {
  FIN_REFERENCE_QUERY,
  type RefCategory,
  type RefCostCenter,
  type RefBankAccount,
  type RefDeal,
  type RefCompany,
  type RefContact,
} from "../../lib/queries/financeiro";

export interface FinReference {
  categories: RefCategory[];
  costCenters: RefCostCenter[];
  bankAccounts: RefBankAccount[];
  deals: RefDeal[];
  companies: RefCompany[];
  contacts: RefContact[];
}

const EMPTY: FinReference = {
  categories: [],
  costCenters: [],
  bankAccounts: [],
  deals: [],
  companies: [],
  contacts: [],
};

export function useFinReference() {
  const { data } = useQuery({
    queryKey: ["fin-reference"],
    queryFn: () =>
      gqlClient.request<{
        financial_categories: RefCategory[];
        cost_centers: RefCostCenter[];
        bank_accounts: RefBankAccount[];
        deals: RefDeal[];
        companies: RefCompany[];
        contacts: RefContact[];
      }>(FIN_REFERENCE_QUERY),
    staleTime: 60_000,
  });

  const ref: FinReference = data
    ? {
        categories: data.financial_categories,
        costCenters: data.cost_centers,
        bankAccounts: data.bank_accounts,
        deals: data.deals,
        companies: data.companies,
        contacts: data.contacts,
      }
    : EMPTY;

  return ref;
}
