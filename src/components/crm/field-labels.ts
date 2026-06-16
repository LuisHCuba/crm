/**
 * Rótulos PT-BR dos campos editáveis, usados no log de auditoria para
 * descrever quais campos foram alterados.
 */

export const CONTACT_FIELD_LABELS: Record<string, string> = {
  full_name: "Nome completo",
  email: "E-mail",
  phone: "Telefone",
  mobile_phone: "Celular",
  job_title: "Cargo",
  stage: "Fase do ciclo de vida",
  origin: "Origem",
  responsible_id: "Proprietário",
};

export const DEAL_FIELD_LABELS: Record<string, string> = {
  title: "Nome do negócio",
  total_value: "Valor",
  forecast_date: "Data de fechamento",
  closed_at: "Fechado em",
  stage_id: "Etapa",
  pipeline_id: "Pipeline",
  responsible_id: "Proprietário",
  company_id: "Empresa",
  loss_reason: "Motivo da perda",
};

export const COMPANY_FIELD_LABELS: Record<string, string> = {
  legal_name: "Razão social",
  trade_name: "Nome fantasia",
  document: "CNPJ",
  type: "Tipo",
  email: "E-mail",
  phone: "Telefone",
  address: "Endereço",
  responsible_id: "Proprietário",
};
