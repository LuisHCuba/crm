import { gqlClient } from "./graphql";
import { CREATE_ACTIVITY } from "./queries/crm";
import { useAuth } from "../store/auth";

/**
 * Log de auditoria do CRM (estilo histórico do HubSpot).
 *
 * Cada ação relevante do sistema (criar/editar/arquivar registros, vincular
 * associações, mover etapa, baixar lançamento, etc.) gera uma atividade do
 * tipo `system` ligada ao(s) objeto(s) envolvido(s). Essas atividades
 * aparecem nas timelines do contato, negócio e empresa.
 *
 * Falhas no registro de auditoria NUNCA devem quebrar a ação principal —
 * por isso os erros são apenas logados no console.
 */

export type ActivityLogType = "system" | "note";

export interface ActivityLink {
  contactId?: string | null;
  companyId?: string | null;
  dealId?: string | null;
}

export interface ActivityLogInput {
  /** Descrição curta e legível em PT-BR (ex.: "Contato criado"). */
  title: string;
  /** Detalhe opcional (ex.: campos alterados). */
  body?: string | null;
  /** Vínculos com objetos do CRM. */
  link: ActivityLink;
  /** Tipo da atividade; padrão `system` (auditoria). */
  type?: ActivityLogType;
}

/** Insere uma atividade de auditoria. Resiliente a erros. */
export async function logActivity(input: ActivityLogInput): Promise<void> {
  const user = useAuth.getState().user;
  const obj: Record<string, unknown> = {
    type: input.type ?? "system",
    title: input.title,
    body: input.body ?? null,
    created_by_id: user?.id ?? null,
  };
  if (input.link.contactId) obj.linked_contact_id = input.link.contactId;
  if (input.link.companyId) obj.linked_company_id = input.link.companyId;
  if (input.link.dealId) obj.linked_deal_id = input.link.dealId;

  try {
    await gqlClient.request(CREATE_ACTIVITY, { obj });
  } catch (e) {
    console.error("Falha ao registrar atividade de auditoria:", e);
  }
}

/** Registra várias atividades de auditoria em paralelo. */
export async function logActivities(inputs: ActivityLogInput[]): Promise<void> {
  await Promise.all(inputs.map((i) => logActivity(i)));
}

/** Constrói um resumo legível dos campos alterados para o corpo da atividade. */
export function describeChanges(
  changes: Record<string, unknown>,
  labels: Record<string, string>
): string {
  const parts = Object.keys(changes)
    .map((k) => labels[k] ?? k)
    .filter(Boolean);
  if (parts.length === 0) return "";
  return `Campos alterados: ${parts.join(", ")}.`;
}
