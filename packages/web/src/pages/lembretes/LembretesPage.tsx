import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { addDays, startOfDay, endOfDay, format } from "date-fns";
import { Check } from "lucide-react";
import { api, extractData, formatMutationError } from "@/lib/api";
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

function linkedLabel(r: Reminder): string {
  if (r.linkedProjectId) return `Projeto ${r.linkedProjectId.slice(0, 8)}…`;
  if (r.linkedDealId) return `Negócio ${r.linkedDealId.slice(0, 8)}…`;
  if (r.linkedCompanyId) return `Empresa ${r.linkedCompanyId.slice(0, 8)}…`;
  if (r.linkedContactId) return `Contato ${r.linkedContactId.slice(0, 8)}…`;
  if (r.linkedTaskId) return `Tarefa ${r.linkedTaskId.slice(0, 8)}…`;
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

export function LembretesPage() {
  const queryClient = useQueryClient();
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

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-[var(--color-text)]">
        Lembretes
      </h1>

      <div className="flex gap-2">
        {(Object.keys(PRESET_LABELS) as FilterPreset[]).map((p) => (
          <Button
            key={p}
            variant={preset === p ? "primary" : "secondary"}
            size="sm"
            onClick={() => setPreset(p)}
          >
            {PRESET_LABELS[p]}
          </Button>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
                <th className="w-10 px-4 py-3" />
                <th className="px-4 py-3 font-semibold text-[var(--color-text)]">
                  Título
                </th>
                <th className="px-4 py-3 font-semibold text-[var(--color-text)]">
                  Registro vinculado
                </th>
                <th className="px-4 py-3 font-semibold text-[var(--color-text)]">
                  Vencimento
                </th>
                <th className="px-4 py-3 font-semibold text-[var(--color-text)]">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-[var(--color-muted)]"
                  >
                    Carregando…
                  </td>
                </tr>
              ) : !data || data.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-[var(--color-muted)]"
                  >
                    Nenhum lembrete.
                  </td>
                </tr>
              ) : (
                data.map((r) => {
                  const st = statusInfo(r);
                  return (
                    <tr
                      key={r.id}
                      className="border-b border-[var(--color-border)] last:border-b-0"
                    >
                      <td className="px-4 py-3">
                        {!r.reminderCompleted && (
                          <button
                            type="button"
                            onClick={() => completeMutation.mutate(r.id)}
                            className="flex size-6 items-center justify-center rounded border border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                            title="Marcar como concluído"
                          >
                            <Check className="size-3.5" />
                          </button>
                        )}
                        {r.reminderCompleted && (
                          <div className="flex size-6 items-center justify-center rounded bg-[var(--color-green)] text-white">
                            <Check className="size-3.5" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text)]">
                        {r.title || "Sem título"}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-accent)]">
                        {linkedLabel(r)}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text)]">
                        {format(new Date(r.reminderDueDate), "dd/MM/yyyy HH:mm")}
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
