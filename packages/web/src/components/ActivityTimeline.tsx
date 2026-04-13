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
  { color: string; bg: string; icon: typeof Bell; label: string }
> = {
  reminder: { color: "text-blue-500", bg: "bg-blue-500", icon: Bell, label: "Lembrete" },
  completed: { color: "text-green-500", bg: "bg-green-500", icon: CheckCircle2, label: "Concluído" },
  note: { color: "text-gray-400", bg: "bg-gray-400", icon: StickyNote, label: "Nota" },
  call: { color: "text-purple-500", bg: "bg-purple-500", icon: Phone, label: "Ligação" },
  meeting: { color: "text-orange-500", bg: "bg-orange-500", icon: Users, label: "Reunião" },
  email: { color: "text-red-500", bg: "bg-red-500", icon: Mail, label: "E-mail" },
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
    <div className="flex gap-3 animate-pulse">
      <div className="flex flex-col items-center">
        <div className="size-3 rounded-full bg-[var(--color-border)]" />
        <div className="w-px flex-1 bg-[var(--color-border)]" />
      </div>
      <div className="flex-1 space-y-2 pb-6">
        <div className="h-4 w-24 rounded bg-[var(--color-border)]" />
        <div className="h-3 w-40 rounded bg-[var(--color-border)]" />
        <div className="h-3 w-56 rounded bg-[var(--color-border)]" />
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
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[var(--color-accent)]"
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
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[var(--color-accent)]"
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
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[var(--color-accent)]"
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
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[var(--color-accent)]"
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
        <p className="py-8 text-center text-sm text-[var(--color-muted)]">
          Nenhuma atividade registrada
        </p>
      ) : (
        <div className="space-y-0">
          {sorted.map((activity, idx) => {
            const config = TYPE_CONFIG[activity.type] ?? TYPE_CONFIG.note;
            const Icon = config.icon;
            const isLast = idx === sorted.length - 1;

            return (
              <div key={activity.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={cn("mt-1 size-3 shrink-0 rounded-full", config.bg)} />
                  {!isLast && <div className="w-px flex-1 bg-[var(--color-border)]" />}
                </div>
                <div className={cn("flex-1", !isLast && "pb-5")}>
                  <div className="flex items-center gap-2">
                    <Icon className={cn("size-4", config.color)} />
                    <span className="text-sm font-semibold text-[var(--color-text)]">
                      {config.label}
                    </span>
                    {activity.title && (
                      <span className="text-sm text-[var(--color-text)]">— {activity.title}</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                    {activity.user?.name ?? "Sistema"}
                    {" — "}
                    {format(new Date(activity.createdAt), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                  {activity.body && (
                    <p className="mt-1 text-sm text-[var(--color-text)] whitespace-pre-line">
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
