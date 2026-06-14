import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Bell,
  StickyNote,
  Phone,
  Users,
  Mail,
  CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { api, formatMutationError } from "@/lib/api";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useUserOptions } from "@/lib/use-options";
import { cn } from "@/lib/cn";

type ActivityTimelineProps = {
  linkedCompanyId?: string;
  linkedContactId?: string;
  linkedDealId?: string;
  linkedProjectId?: string;
  linkedTaskId?: string;
};

type Activity = {
  id: string;
  type: string;
  title?: string;
  body?: string;
  dueDate?: string;
  responsibleId?: string;
  callDurationMinutes?: number;
  callResult?: string;
  meetingDate?: string;
  meetingParticipants?: string;
  emailSubject?: string;
  createdAt: string;
  user?: { id: string; name: string };
};

const ACTIVITY_TYPES = [
  { value: "reminder", label: "Lembrete" },
  { value: "note", label: "Nota" },
  { value: "call", label: "Ligação" },
  { value: "meeting", label: "Reunião" },
  { value: "email", label: "E-mail" },
] as const;

const CALL_RESULT_OPTIONS = [
  { value: "answered", label: "Atendida" },
  { value: "no_answer", label: "Sem resposta" },
  { value: "busy", label: "Ocupado" },
  { value: "voicemail", label: "Caixa postal" },
];

const TYPE_CONFIG: Record<
  string,
  { iconClass: string; badgeClass: string; icon: typeof Bell; label: string }
> = {
  reminder: {
    iconClass: "text-[var(--color-info)]",
    badgeClass: "bg-[var(--color-info-soft)]",
    icon: Bell,
    label: "Lembrete",
  },
  completed: {
    iconClass: "text-[var(--color-success)]",
    badgeClass: "bg-[var(--color-success-soft)]",
    icon: CheckCircle2,
    label: "Concluído",
  },
  note: {
    iconClass: "text-[var(--color-muted)]",
    badgeClass: "bg-[var(--color-surface-2)]",
    icon: StickyNote,
    label: "Nota",
  },
  call: {
    iconClass: "text-[var(--color-accent)]",
    badgeClass: "bg-[var(--color-accent-soft)]",
    icon: Phone,
    label: "Ligação",
  },
  meeting: {
    iconClass: "text-[var(--color-warning)]",
    badgeClass: "bg-[var(--color-warning-soft)]",
    icon: Users,
    label: "Reunião",
  },
  email: {
    iconClass: "text-[var(--color-danger)]",
    badgeClass: "bg-[var(--color-danger-soft)]",
    icon: Mail,
    label: "E-mail",
  },
};

function buildLinkedParams(props: ActivityTimelineProps) {
  const params: Record<string, string> = {};
  if (props.linkedCompanyId) params.linkedCompanyId = props.linkedCompanyId;
  if (props.linkedContactId) params.linkedContactId = props.linkedContactId;
  if (props.linkedDealId) params.linkedDealId = props.linkedDealId;
  if (props.linkedProjectId) params.linkedProjectId = props.linkedProjectId;
  if (props.linkedTaskId) params.linkedTaskId = props.linkedTaskId;
  return params;
}

function SkeletonItem() {
  return (
    <div className="flex animate-pulse gap-3">
      <div className="flex flex-col items-center">
        <div className="size-8 shrink-0 rounded-full bg-[var(--color-surface-2)]" />
        <div className="mt-1 w-px flex-1 bg-[var(--color-border)]" />
      </div>
      <div className="flex-1 space-y-2 pb-6 pt-1.5">
        <div className="h-4 w-24 rounded-[var(--radius-sm)] bg-[var(--color-surface-2)]" />
        <div className="h-3 w-40 rounded-[var(--radius-sm)] bg-[var(--color-surface-2)]" />
        <div className="h-3 w-56 rounded-[var(--radius-sm)] bg-[var(--color-surface-2)]" />
      </div>
    </div>
  );
}

type FormData = {
  type: string;
  title: string;
  body: string;
  dueDate: string;
  responsibleId: string;
  callDurationMinutes: string;
  callResult: string;
  meetingDate: string;
  meetingParticipants: string;
  emailSubject: string;
};

const EMPTY_FORM: FormData = {
  type: "",
  title: "",
  body: "",
  dueDate: "",
  responsibleId: "",
  callDurationMinutes: "",
  callResult: "",
  meetingDate: "",
  meetingParticipants: "",
  emailSubject: "",
};

function ActivityForm({
  open,
  onClose,
  linkedParams,
}: {
  open: boolean;
  onClose: () => void;
  linkedParams: Record<string, string>;
}) {
  const qc = useQueryClient();
  const userOptions = useUserOptions();
  const [form, setForm] = useState<FormData>(EMPTY_FORM);

  const set = (key: keyof FormData, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const create = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api.post("/atividades", payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["atividades"] });
      toast.success("Atividade criada");
      setForm(EMPTY_FORM);
      onClose();
    },
    onError: (e) => toast.error(formatMutationError("Erro ao criar atividade", e)),
  });

  const handleSubmit = () => {
    const payload: Record<string, unknown> = {
      type: form.type,
      ...linkedParams,
    };

    switch (form.type) {
      case "reminder":
        payload.title = form.title;
        payload.dueDate = form.dueDate;
        payload.responsibleId = form.responsibleId;
        break;
      case "note":
        payload.body = form.body;
        break;
      case "call":
        payload.callDurationMinutes = form.callDurationMinutes ? Number(form.callDurationMinutes) : undefined;
        payload.callResult = form.callResult;
        payload.body = form.body;
        break;
      case "meeting":
        payload.meetingDate = form.meetingDate;
        payload.meetingParticipants = form.meetingParticipants;
        payload.body = form.body;
        break;
      case "email":
        payload.emailSubject = form.emailSubject;
        payload.body = form.body;
        break;
    }

    create.mutate(payload);
  };

  const handleClose = () => {
    setForm(EMPTY_FORM);
    onClose();
  };

  return (
    <Modal
      open={open}
      onOpenChange={(v) => !v && handleClose()}
      title="Nova atividade"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={handleClose} disabled={create.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} loading={create.isPending} disabled={!form.type}>
            Salvar
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Select
          label="Tipo"
          options={[...ACTIVITY_TYPES]}
          value={form.type}
          onChange={(v) => set("type", v)}
          placeholder="Selecione o tipo…"
        />

        {form.type === "reminder" && (
          <>
            <Input label="Título" value={form.title} onChange={(e) => set("title", e.target.value)} />
            <Input label="Data de vencimento" type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
            <Select
              label="Responsável"
              options={userOptions}
              value={form.responsibleId}
              onChange={(v) => set("responsibleId", v)}
              placeholder="Selecione…"
            />
          </>
        )}

        {form.type === "note" && (
          <div className="w-full">
            <label htmlFor="activity-note-body" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Conteúdo</label>
            <textarea
              id="activity-note-body"
              value={form.body}
              onChange={(e) => set("body", e.target.value)}
              rows={4}
              className="w-full rounded-[var(--radius-lg)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-faint)] outline-none transition-colors focus-visible:border-[var(--color-accent)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-ring)_35%,transparent)]"
            />
          </div>
        )}

        {form.type === "call" && (
          <>
            <Input
              label="Duração (minutos)"
              type="number"
              value={form.callDurationMinutes}
              onChange={(e) => set("callDurationMinutes", e.target.value)}
            />
            <Select
              label="Resultado"
              options={CALL_RESULT_OPTIONS}
              value={form.callResult}
              onChange={(v) => set("callResult", v)}
              placeholder="Selecione…"
            />
            <div className="w-full">
              <label htmlFor="activity-call-body" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Observações</label>
              <textarea
                id="activity-call-body"
                value={form.body}
                onChange={(e) => set("body", e.target.value)}
                rows={3}
                className="w-full rounded-[var(--radius-lg)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-faint)] outline-none transition-colors focus-visible:border-[var(--color-accent)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-ring)_35%,transparent)]"
              />
            </div>
          </>
        )}

        {form.type === "meeting" && (
          <>
            <Input
              label="Data da reunião"
              type="datetime-local"
              value={form.meetingDate}
              onChange={(e) => set("meetingDate", e.target.value)}
            />
            <Input
              label="Participantes"
              value={form.meetingParticipants}
              onChange={(e) => set("meetingParticipants", e.target.value)}
              placeholder="Nomes separados por vírgula"
            />
            <div className="w-full">
              <label htmlFor="activity-meeting-body" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Pauta / Observações</label>
              <textarea
                id="activity-meeting-body"
                value={form.body}
                onChange={(e) => set("body", e.target.value)}
                rows={3}
                className="w-full rounded-[var(--radius-lg)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-faint)] outline-none transition-colors focus-visible:border-[var(--color-accent)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-ring)_35%,transparent)]"
              />
            </div>
          </>
        )}

        {form.type === "email" && (
          <>
            <Input
              label="Assunto"
              value={form.emailSubject}
              onChange={(e) => set("emailSubject", e.target.value)}
            />
            <div className="w-full">
              <label htmlFor="activity-email-body" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Corpo do e-mail</label>
              <textarea
                id="activity-email-body"
                value={form.body}
                onChange={(e) => set("body", e.target.value)}
                rows={4}
                className="w-full rounded-[var(--radius-lg)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-faint)] outline-none transition-colors focus-visible:border-[var(--color-accent)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-ring)_35%,transparent)]"
              />
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

export function ActivityTimeline(props: ActivityTimelineProps) {
  const [formOpen, setFormOpen] = useState(false);
  const linkedParams = buildLinkedParams(props);

  const hasLinked = Object.keys(linkedParams).length > 0;

  const { data, isLoading } = useQuery({
    queryKey: ["atividades", linkedParams],
    queryFn: () => api.get("/atividades", { params: linkedParams }).then((r) => r.data),
    enabled: hasLinked,
  });

  const activities: Activity[] = Array.isArray(data)
    ? data
    : Array.isArray(data?.data)
      ? data.data
      : [];

  const sorted = [...activities].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  if (isLoading) {
    return (
      <div className="space-y-1">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--color-text)]">Atividades</h3>
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonItem key={i} />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--color-text)]">Atividades</h3>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="size-4" />
          Atividade
        </Button>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-[var(--radius-xl)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] px-6 py-12 text-center text-sm text-[var(--color-muted)]">
          Nenhuma atividade registrada
        </div>
      ) : (
        <div className="space-y-0">
          {sorted.map((activity, idx) => {
            const config = TYPE_CONFIG[activity.type] ?? TYPE_CONFIG.note;
            const Icon = config.icon;
            const isLast = idx === sorted.length - 1;

            return (
              <div key={activity.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ring-[var(--color-border)]",
                      config.badgeClass,
                    )}
                  >
                    <Icon className={cn("size-4", config.iconClass)} aria-hidden />
                  </div>
                  {!isLast && <div className="mt-1 w-px flex-1 bg-[var(--color-border)]" />}
                </div>
                <div className={cn("flex-1 pt-1", !isLast && "pb-5")}>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="text-sm font-semibold text-[var(--color-text)]">
                      {config.label}
                    </span>
                    {activity.title && (
                      <span className="text-sm text-[var(--color-muted)]">— {activity.title}</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                    {activity.user?.name ?? "Sistema"}
                    {" — "}
                    {format(new Date(activity.createdAt), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                  {activity.body && (
                    <p className="mt-1.5 whitespace-pre-line text-sm text-[var(--color-text)]">
                      {activity.body}
                    </p>
                  )}
                  {activity.type === "call" && activity.callDurationMinutes != null && (
                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                      Duração: {activity.callDurationMinutes} min
                      {activity.callResult ? ` · ${activity.callResult}` : ""}
                    </p>
                  )}
                  {activity.type === "meeting" && activity.meetingDate && (
                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                      Data: {format(new Date(activity.meetingDate), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      {activity.meetingParticipants ? ` · ${activity.meetingParticipants}` : ""}
                    </p>
                  )}
                  {activity.type === "email" && activity.emailSubject && (
                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                      Assunto: {activity.emailSubject}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ActivityForm open={formOpen} onClose={() => setFormOpen(false)} linkedParams={linkedParams} />
    </div>
  );
}
