import { STATUS_LABEL } from "@/lib/financial-constants";

export const AUDIT_ACTION_LABEL: Record<string, string> = {
  created: "Criado",
  updated: "Atualizado",
  archived: "Arquivado",
  restored: "Restaurado",
  stage_changed: "Etapa alterada",
  create: "Criação",
  update: "Atualização",
  delete: "Exclusão",
};

export const OBJECT_TYPE_LABEL: Record<string, string> = {
  project: "Projeto",
  project_task: "Tarefa",
  project_subtask: "Subtarefa",
  project_stage: "Etapa de projeto",
  deal: "Negócio",
  company: "Empresa",
  contact: "Contato",
  product: "Produto",
  activity: "Atividade",
  user: "Usuário",
  pipeline: "Pipeline",
  pipeline_stage: "Etapa de pipeline",
  financial_category: "Categoria financeira",
  bank_account: "Conta bancária",
  receivable: "Conta a receber",
  payable: "Conta a pagar",
};

export const FIELD_LABEL: Record<string, string> = {
  stageId: "Estágio",
  pipelineId: "Pipeline",
  companyId: "Empresa",
  responsibleId: "Responsável",
  contactId: "Contato",
  dealId: "Negócio",
  productId: "Produto",
  categoryId: "Categoria",
  bankAccountId: "Conta bancária",
  projectId: "Projeto",
  userId: "Usuário",
  linkedProjectId: "Projeto vinculado",
  linkedDealId: "Negócio vinculado",
  linkedCompanyId: "Empresa vinculada",
  linkedContactId: "Contato vinculado",
  linkedTaskId: "Tarefa vinculada",
  dependsOnTaskId: "Depende da tarefa",
  parentTaskId: "Tarefa pai",
  fullName: "Nome",
  legalName: "Razão social",
  tradeName: "Nome fantasia",
  title: "Título",
  name: "Nome",
  email: "E-mail",
  phone: "Telefone",
  document: "Documento",
  status: "Status",
  stage: "Estágio",
  origin: "Origem",
  type: "Tipo",
  lossReason: "Motivo da perda",
  priority: "Prioridade",
  macroGroup: "Grupo macro",
  recurrence: "Recorrência",
  active: "Ativo",
  value: "Valor",
  totalValue: "Valor total",
  quantity: "Quantidade",
  unitPrice: "Preço unitário",
  discountPercent: "Desconto (%)",
  description: "Descrição",
  notes: "Observações",
  dueDate: "Vencimento",
  paidAt: "Pago em",
  plannedStartDate: "Início previsto",
  plannedEndDate: "Fim previsto",
  actualStartDate: "Início real",
  actualEndDate: "Fim real",
  reminderDueDate: "Lembrete",
  reminderCompleted: "Lembrete concluído",
  jobTitle: "Cargo",
  percentage: "Percentual",
  order: "Ordem",
  role: "Perfil",
  password: "Senha",
};

const ENUM_BY_FIELD: Record<string, Record<string, string>> = {
  status: {
    ...STATUS_LABEL,
    planning: "Planejamento",
    in_progress: "Em andamento",
    completed: "Concluído",
    cancelled: "Cancelado",
    on_hold: "Em pausa",
    open: "Aberto",
    won: "Ganho",
    lost: "Perdido",
  },
  stage: {
    new: "Novo",
    qualified: "Qualificado",
    active_client: "Cliente ativo",
    inactive: "Inativo",
  },
  origin: {
    website: "Website",
    referral: "Indicação",
    event: "Evento",
    other: "Outro",
  },
  type: {
    client: "Cliente",
    supplier: "Fornecedor",
    both: "Cliente e fornecedor",
    revenue: "Receita",
    expense: "Despesa",
    open: "Aberto",
    won: "Ganho",
    lost: "Perdido",
  },
  lossReason: {
    price: "Preço",
    competition: "Concorrência",
    timing: "Timing",
    no_response: "Sem resposta",
    other: "Outro",
  },
  priority: {
    low: "Baixa",
    medium: "Média",
    high: "Alta",
  },
  macroGroup: {
    not_started: "Não iniciado",
    in_progress: "Em andamento",
    completed: "Concluído",
    paused: "Pausado",
    cancelled: "Cancelado",
  },
  recurrence: {
    none: "Sem recorrência",
    monthly: "Mensal",
    bimonthly: "Bimestral",
    quarterly: "Trimestral",
    semiannual: "Semestral",
    annual: "Anual",
  },
  role: {
    admin: "Administrador",
    member: "Membro",
  },
  activityType: {
    reminder: "Lembrete",
    note: "Nota",
    call: "Ligação",
    meeting: "Reunião",
    email: "E-mail",
  },
  callResult: {
    answered: "Atendeu",
    no_answer: "Não atendeu",
    voicemail: "Caixa postal",
  },
};

const REFERENCE_FIELD_MAP: Record<string, keyof ReferenceLookupKeys> = {
  userId: "users",
  responsibleId: "users",
  companyId: "companies",
  contactId: "contacts",
  productId: "products",
  pipelineId: "pipelines",
  stageId: "stages",
  dealId: "deals",
  categoryId: "categories",
  bankAccountId: "bankAccounts",
  projectId: "projects",
  linkedProjectId: "projects",
  linkedDealId: "deals",
  linkedCompanyId: "companies",
  linkedContactId: "contacts",
  linkedTaskId: "tasks",
  dependsOnTaskId: "tasks",
  parentTaskId: "tasks",
};

export type ReferenceLookupKeys =
  | "users"
  | "companies"
  | "contacts"
  | "products"
  | "pipelines"
  | "stages"
  | "deals"
  | "categories"
  | "bankAccounts"
  | "projects"
  | "tasks";

export type ReferenceLookups = Record<ReferenceLookupKeys, Map<string, string>>;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function formatUnresolvedId(id: string): string {
  if (!id) return "—";
  if (isUuid(id)) return `${id.slice(0, 8)}…`;
  return id;
}

export function resolveOptionLabel(
  options: { value: string; label: string }[],
  id: string | null | undefined,
): string | null {
  if (!id) return null;
  const found = options.find((o) => o.value === id)?.label;
  if (found) return found;
  if (isUuid(id)) return formatUnresolvedId(id);
  return id;
}

export function formatFieldName(field: string | null | undefined): string {
  if (!field) return "—";
  return FIELD_LABEL[field] ?? field;
}

export function formatAuditAction(action: string): string {
  return AUDIT_ACTION_LABEL[action] ?? action;
}

export function formatObjectType(objectType: string): string {
  return OBJECT_TYPE_LABEL[objectType] ?? objectType;
}

function formatBoolean(value: string): string | null {
  const v = value.toLowerCase();
  if (v === "true" || v === "1") return "Sim";
  if (v === "false" || v === "0") return "Não";
  return null;
}

export function resolveReferenceValue(
  field: string | null | undefined,
  value: string | null | undefined,
  lookups: ReferenceLookups,
): string {
  if (value == null || value === "") return "—";

  const trimmed = value.trim();

  if (field && ENUM_BY_FIELD[field]?.[trimmed]) {
    return ENUM_BY_FIELD[field][trimmed]!;
  }

  const boolLabel = formatBoolean(trimmed);
  if (boolLabel && (field === "active" || field === "reminderCompleted")) {
    return boolLabel;
  }

  const refKey = field ? REFERENCE_FIELD_MAP[field] : undefined;
  if (refKey) {
    const label = lookups[refKey].get(trimmed);
    if (label) return label;
    if (isUuid(trimmed)) return formatUnresolvedId(trimmed);
  }

  if (isUuid(trimmed)) {
    for (const map of Object.values(lookups)) {
      const label = map.get(trimmed);
      if (label) return label;
    }
    return formatUnresolvedId(trimmed);
  }

  return trimmed;
}

export function resolveRecordLabel(
  objectType: string,
  recordId: string,
  lookups: ReferenceLookups,
): string {
  const byType: Partial<Record<string, ReferenceLookupKeys>> = {
    deal: "deals",
    company: "companies",
    contact: "contacts",
    product: "products",
    project: "projects",
    project_task: "tasks",
    project_subtask: "tasks",
    user: "users",
    pipeline: "pipelines",
    pipeline_stage: "stages",
    project_stage: "stages",
    financial_category: "categories",
    bank_account: "bankAccounts",
    receivable: "deals",
    payable: "deals",
  };

  const key = byType[objectType];
  if (key) {
    const label = lookups[key].get(recordId);
    if (label) return label;
  }

  return formatUnresolvedId(recordId);
}
