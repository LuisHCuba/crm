import { useQuery } from "@tanstack/react-query";
import { gqlClient } from "../../lib/graphql";
import {
  FIN_REFERENCE_QUERY,
  type RefCategory,
  type RefCostCenter,
  type RefBankAccount,
} from "../../lib/queries/financeiro";

/*
 * Apenas tabelas de configuração (pequenas por natureza). Empresas,
 * negócios e contatos NÃO são carregados aqui — os seletores usam busca
 * no servidor via SearchSelect (lib/entity-search.ts), que escala.
 */
export interface FinReference {
  categories: RefCategory[];
  costCenters: RefCostCenter[];
  bankAccounts: RefBankAccount[];
}

const EMPTY: FinReference = {
  categories: [],
  costCenters: [],
  bankAccounts: [],
};

export function useFinReference() {
  const { data } = useQuery({
    queryKey: ["fin-reference"],
    queryFn: () =>
      gqlClient.request<{
        financial_categories: RefCategory[];
        cost_centers: RefCostCenter[];
        bank_accounts: RefBankAccount[];
      }>(FIN_REFERENCE_QUERY),
    staleTime: 60_000,
  });

  const ref: FinReference = data
    ? {
        categories: data.financial_categories,
        costCenters: data.cost_centers,
        bankAccounts: data.bank_accounts,
      }
    : EMPTY;

  return ref;
}
