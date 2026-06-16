import { useMemo, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Bell,
  FileText,
  History,
  Loader2,
  Mail,
  Phone,
  Search,
  Send,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { gqlClient } from "../../../lib/graphql";
import {
  CREATE_CONTACT_ACTIVITY,
  type ContactActivity,
} from "../../../lib/queries/contact-detail";
import type { ActivityType } from "../../../lib/queries/crm";
import { useAuth } from "../../../store/auth";
import { ACTIVITY_TYPE_LABELS, CALL_RESULT_LABELS } from "../labels";
import { Avatar, fieldInputClass } from "../ui";

const TYPE_ICON: Record<ActivityType, typeof FileText> = {
  note: FileText,
  call: Phone,
  meeting: Users,
  email: Mail,
  reminder: Bell,
  system: History,
};

const TYPE_COLOR: Record<ActivityType, string> = {
  note: "bg-amber-100 text-amber-700",
  call: "bg-sky-100 text-sky-700",
  meeting: "bg-violet-100 text-violet-700",
  email: "bg-indigo-100 text-indigo-700",
  reminder: "bg-rose-100 text-rose-700",
  system: "bg-slate-100 text-slate-600",
};

/** Filtros do estilo HubSpot (Todas, Observações, E-mails, Chamadas, Tarefas, Reuniões). */
const FILTERS: { key: "all" | ActivityType; label: string }[] = [
  { key: "all", label: "Todas as atividades" },
  { key: "note", label: "Observações" },
  { key: "email", label: "E-mails" },
  { key: "call", label: "Chamadas" },
  { key: "reminder", label: "Tarefas" },
  { key: "meeting", label: "Reuniões" },
  { key: "system", label: "Sistema" },
];

const COMPOSER_TABS: ActivityType[] = [
  "note",
  "call",
  "meeting",
  "email",
  "reminder",
];

function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function monthKey(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Sem data";
  const label = d.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function ActivityTimeline({
  activities,
  contactId,
  onCreated,
}: {
  activities: ContactActivity[];
  contactId: string;
  onCreated: () => void;
}) {
  const user = useAuth((s) => s.user);
  const [tab, setTab] = useState<ActivityType>("note");
  const [filter, setFilter] = useState<"all" | ActivityType>("all");
  const [search, setSearch] = useState("");

  const createMutation = useMutation({
    mutationFn: (obj: Record<string, unknown>) =>
      gqlClient.request(CREATE_CONTACT_ACTIVITY, { obj }),
    onSuccess: () => {
      toast.success("Atividade registrada");
      onCreated();
    },
    onError: () => toast.error("Erro ao registrar atividade"),
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) {
      toast.error("Faça login para registrar atividades");
      return;
    }
    const formEl = e.currentTarget;
    const fd = new FormData(formEl);
    const body = (fd.get("body") as string)?.trim();
    if (!body && tab === "note") {
      toast.error("Escreva algo na nota");
      return;
    }
    const obj: Record<string, unknown> = {
      type: tab,
      title: (fd.get("title") as string)?.trim() || null,
      body: body || null,
      created_by_id: user.id,
      linked_contact_id: contactId,
    };
    if (tab === "call") {
      obj.call_result = (fd.get("call_result") as string) || null;
      const dur = fd.get("call_duration_minutes") as string;
      obj.call_duration_minutes = dur ? Number(dur) : null;
    }
    if (tab === "meeting") {
      const dt = fd.get("meeting_date") as string;
      obj.meeting_date = dt ? new Date(dt).toISOString() : null;
    }
    if (tab === "email") {
      obj.email_subject = (fd.get("title") as string)?.trim() || null;
    }
    if (tab === "reminder") {
      if (!(fd.get("title") as string)?.trim()) {
        toast.error("Dê um nome à tarefa");
        return;
      }
      const dt = fd.get("reminder_due_date") as string;
      obj.reminder_due_date = dt ? new Date(dt).toISOString() : null;
    }
    createMutation.mutate(obj, {
      onSuccess: () => formEl.reset(),
    });
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return activities.filter((a) => {
      if (filter !== "all" && a.type !== filter) return false;
      if (term) {
        const haystack = `${a.title ?? ""} ${a.body ?? ""} ${
          a.email_subject ?? ""
        }`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [activities, filter, search]);

  const groups = useMemo(() => {
    const map = new Map<string, ContactActivity[]>();
    for (const a of filtered) {
      const key = monthKey(a.created_at);
      const arr = map.get(key) ?? [];
      arr.push(a);
      map.set(key, arr);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div>
      {/* Compositor */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap gap-1">
          {COMPOSER_TABS.map((t) => {
            const Icon = TYPE_ICON[t];
            const active = tab === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  active
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                <Icon size={15} />
                {ACTIVITY_TYPE_LABELS[t]}
              </button>
            );
          })}
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          {(tab === "meeting" || tab === "email" || tab === "reminder") && (
            <input
              name="title"
              placeholder={
                tab === "email"
                  ? "Assunto"
                  : tab === "reminder"
                    ? "Tarefa (ex.: Ligar para o cliente)"
                    : "Título da reunião"
              }
              className={fieldInputClass}
            />
          )}
          <textarea
            name="body"
            rows={3}
            placeholder={
              tab === "note"
                ? "Escreva uma observação..."
                : tab === "call"
                  ? "Resumo da ligação..."
                  : tab === "meeting"
                    ? "Anotações da reunião..."
                    : tab === "reminder"
                      ? "Detalhes da tarefa..."
                      : "Conteúdo do e-mail..."
            }
            className={fieldInputClass}
          />
          {tab === "call" && (
            <div className="flex gap-3">
              <select name="call_result" className={fieldInputClass}>
                <option value="">Resultado...</option>
                <option value="answered">Atendida</option>
                <option value="no_answer">Não atendeu</option>
                <option value="voicemail">Caixa postal</option>
              </select>
              <input
                name="call_duration_minutes"
                type="number"
                min="0"
                placeholder="Duração (min)"
                className={fieldInputClass}
              />
            </div>
          )}
          {tab === "meeting" && (
            <input
              name="meeting_date"
              type="datetime-local"
              className={fieldInputClass}
            />
          )}
          {tab === "reminder" && (
            <input
              name="reminder_due_date"
              type="datetime-local"
              className={fieldInputClass}
            />
          )}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {createMutation.isPending ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Send size={15} />
              )}
              Registrar
            </button>
          </div>
        </form>
      </div>

      {/* Cabeçalho: busca + filtros */}
      <div className="mt-5 space-y-3">
        <div className="relative">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar atividades"
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            const count =
              f.key === "all"
                ? activities.length
                : activities.filter((a) => a.type === f.key).length;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  active
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {f.label}
                {f.key !== "all" && ` (${count})`}
              </button>
            );
          })}
        </div>
      </div>

      {/* Linha do tempo agrupada por mês */}
      <div className="mt-5">
        {filtered.length === 0 ? (
          <p className="px-1 py-10 text-center text-sm text-slate-400">
            {activities.length === 0
              ? "Nenhuma atividade ainda. Registre a primeira acima."
              : "Nenhuma atividade para este filtro."}
          </p>
        ) : (
          <div className="space-y-6">
            {groups.map(([month, items]) => (
              <div key={month}>
                <h4 className="mb-3 text-sm font-bold text-slate-700">
                  {month}
                </h4>
                <ol className="relative space-y-4 border-l border-slate-200 pl-6">
                  {items.map((a) => {
                    const Icon = TYPE_ICON[a.type];
                    return (
                      <li key={a.id} className="relative">
                        <span
                          className={`absolute -left-[33px] flex h-7 w-7 items-center justify-center rounded-full ring-4 ring-slate-50 ${TYPE_COLOR[a.type]}`}
                        >
                          <Icon size={14} />
                        </span>
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              {ACTIVITY_TYPE_LABELS[a.type]}
                            </span>
                            <span className="text-xs text-slate-400">
                              {formatDateTime(a.created_at)}
                            </span>
                          </div>
                          {(a.title || a.email_subject) && (
                            <p className="mt-1 text-sm font-semibold text-slate-900">
                              {a.title || a.email_subject}
                            </p>
                          )}
                          {a.body && (
                            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
                              {a.body}
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                            {a.created_by && (
                              <span className="flex items-center gap-1.5">
                                <Avatar name={a.created_by.name} size={18} />
                                {a.created_by.name}
                              </span>
                            )}
                            {a.call_result && (
                              <span>
                                ·{" "}
                                {CALL_RESULT_LABELS[a.call_result] ??
                                  a.call_result}
                              </span>
                            )}
                            {a.call_duration_minutes != null && (
                              <span>· {a.call_duration_minutes} min</span>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
