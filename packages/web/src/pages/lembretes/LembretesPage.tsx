import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  addDays,
  startOfDay,
  endOfDay,
  format,
  isToday,
  isPast,
} from "date-fns";
import { BellRing, Calendar, Check, Link2 } from "lucide-react";
import { api, extractData, formatMutationError } from "@/lib/api";
import { useReferenceLabels } from "@/lib/use-reference-labels";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

type FilterPreset = "today" | "overdue" | "week" | "all";

type Reminder = {
  id: string;
  title: string | null;
  body: string | null;
  reminderDueDate: string;
  reminderCompleted: string | null;
  linkedCompanyId: string | null;
  linkedContactId: string | null;
  linkedDealId: string | null;
  linkedProjectId: string | null;
  linkedTaskId: string | null;
  createdAt: string;
};

const PRESET_LABELS: Record<FilterPreset, string> = {
  today: "Hoje",
  overdue: "Atrasados",
  week: "Próximos 7 dias",
  all: "Todos",
};

function linkedLabel(
  r: Reminder,
  maps: {
    projectMap: Map<string, string>;
    dealMap: Map<string, string>;
    companyMap: Map<string, string>;
    contactMap: Map<string, string>;
    taskMap: Map<string, string>;
  },
): string {
  if (r.linkedProjectId) {
    const name = maps.projectMap.get(r.linkedProjectId);
    return name ? `Projeto: ${name}` : `Projeto ${r.linkedProjectId.slice(0, 8)}…`;
  }
  if (r.linkedDealId) {
    const name = maps.dealMap.get(r.linkedDealId);
    return name ? `Negócio: ${name}` : `Negócio ${r.linkedDealId.slice(0, 8)}…`;
  }
  if (r.linkedCompanyId) {
    const name = maps.companyMap.get(r.linkedCompanyId);
    return name ? `Empresa: ${name}` : `Empresa ${r.linkedCompanyId.slice(0, 8)}…`;
  }
  if (r.linkedContactId) {
    const name = maps.contactMap.get(r.linkedContactId);
    return name ? `Contato: ${name}` : `Contato ${r.linkedContactId.slice(0, 8)}…`;
  }
  if (r.linkedTaskId) {
    const name = maps.taskMap.get(r.linkedTaskId);
    return name ? `Tarefa: ${name}` : `Tarefa ${r.linkedTaskId.slice(0, 8)}…`;
  }
  return "—";
}

function statusInfo(r: Reminder): {
  label: string;
  variant: "success" | "danger" | "warning" | "neutral";
} {
  if (r.reminderCompleted) return { label: "Concluído", variant: "success" };
  const due = new Date(r.reminderDueDate);
  if (due < new Date()) return { label: "Atrasado", variant: "danger" };
  return { label: "Pendente", variant: "warning" };
}

// Realce de prazo: vencido (danger) / hoje (warning) / futuro (neutro),
// salvo quando já concluído.
function dueEmphasis(r: Reminder): "danger" | "warning" | "muted" {
  if (r.reminderCompleted) return "muted";
  const due = new Date(r.reminderDueDate);
  if (isPast(due) && !isToday(due)) return "danger";
  if (isToday(due)) return "warning";
  return "muted";
}

const DUE_CLASSES: Record<"danger" | "warning" | "muted", string> = {
  danger: "text-[var(--color-danger)]",
  warning: "text-[var(--color-warning)]",
  muted: "text-[var(--color-text)]",
};

const COL_COUNT = 5;

export function LembretesPage() {
  const queryClient = useQueryClient();
  const { projectMap, dealMap, companyMap, contactMap, taskMap } = useReferenceLabels();
  const linkedMaps = { projectMap, dealMap, companyMap, contactMap, taskMap };
  const [preset, setPreset] = useState<FilterPreset>("today");

  const now = new Date();
  const params: Record<string, string> = {};

  if (preset === "today") {
    params.dueDateFrom = startOfDay(now).toISOString();
    params.dueDateTo = endOfDay(now).toISOString();
  } else if (preset === "overdue") {
    params.dueDateTo = now.toISOString();
    params.status = "pending";
  } else if (preset === "week") {
    params.dueDateFrom = startOfDay(now).toISOString();
    params.dueDateTo = endOfDay(addDays(now, 7)).toISOString();
  }

  const { data, isLoading } = useQuery({
    queryKey: ["lembretes", params],
    queryFn: () =>
      api.get("/lembretes", { params }).then((r) => extractData<Reminder>(r)),
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/lembretes/${id}/concluir`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lembretes"] });
      toast.success("Lembrete concluído");
    },
    onError: (e) =>
      toast.error(formatMutationError("Erro ao concluir lembrete", e)),
  });

  const count = data?.length ?? 0;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
            <BellRing className="size-5" />
          </span>
          <div className="flex flex-col gap-0.5">
            <h1 className="text-xl font-semibold text-[var(--color-text)] md:text-2xl">
              Lembretes
            </h1>
            <p className="text-xs text-[var(--color-muted)]">
              {PRESET_LABELS[preset]}
              {!isLoading && (
                <>
                  {" · "}
                  {count} {count === 1 ? "lembrete" : "lembretes"}
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(Object.keys(PRESET_LABELS) as FilterPreset[]).map((p) => (
          <Button
            key={p}
            variant={preset === p ? "primary" : "outline"}
            size="sm"
            onClick={() => setPreset(p)}
            aria-pressed={preset === p}
          >
            {PRESET_LABELS[p]}
          </Button>
        ))}
      </div>

      <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-xs)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
                <th className="w-12 px-4 py-3" />
                <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
                  Título
                </th>
                <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
                  Registro vinculado
                </th>
                <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
                  Vencimento
                </th>
                <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr
                    key={i}
                    className="border-b border-[var(--color-border)] last:border-b-0"
                  >
                    {Array.from({ length: COL_COUNT }).map((__, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div className="h-4 animate-pulse rounded-[var(--radius-full)] bg-[var(--color-surface-2)]" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : !data || data.length === 0 ? (
                <tr>
                  <td colSpan={COL_COUNT} className="px-4 py-12">
                    <div className="flex flex-col items-center gap-2 text-center">
                      <span className="flex size-11 items-center justify-center rounded-[var(--radius-full)] bg-[var(--color-surface-2)] text-[var(--color-faint)]">
                        <BellRing className="size-5" />
                      </span>
                      <p className="text-sm font-medium text-[var(--color-text)]">
                        Nenhum lembrete
                      </p>
                      <p className="text-xs text-[var(--color-muted)]">
                        Não há lembretes para o filtro “{PRESET_LABELS[preset]}”.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((r) => {
                  const st = statusInfo(r);
                  const emphasis = dueEmphasis(r);
                  const done = Boolean(r.reminderCompleted);
                  return (
                    <tr
                      key={r.id}
                      className="border-b border-[var(--color-border)] transition-colors last:border-b-0 hover:bg-[var(--color-surface-hover)]"
                    >
                      <td className="px-4 py-3">
                        {done ? (
                          <span
                            className="flex size-7 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-success-soft)] text-[var(--color-success)]"
                            aria-label="Concluído"
                          >
                            <Check className="size-4" />
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => completeMutation.mutate(r.id)}
                            disabled={completeMutation.isPending}
                            className="flex size-7 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border-strong)] text-[var(--color-muted)] outline-none transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent)] focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)] disabled:opacity-50"
                            aria-label="Marcar como concluído"
                            title="Marcar como concluído"
                          >
                            <Check className="size-4" />
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            done
                              ? "font-medium text-[var(--color-muted)] line-through"
                              : "font-medium text-[var(--color-text)]"
                          }
                        >
                          {r.title || "Sem título"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const label = linkedLabel(r, linkedMaps);
                          return label === "—" ? (
                            <span className="text-[var(--color-faint)]">—</span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[var(--color-accent)]">
                              <Link2 className="size-3.5" />
                              {label}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 ${DUE_CLASSES[emphasis]}`}
                        >
                          <Calendar className="size-3.5 opacity-70" />
                          {format(
                            new Date(r.reminderDueDate),
                            "dd/MM/yyyy HH:mm",
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
