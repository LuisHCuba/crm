import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Archive, UserCheck, Mail, Phone, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { gqlClient } from "../lib/graphql";
import { logActivity } from "../lib/activity-log";
import {
  ARCHIVE_CONTACTS_BULK,
  ASSIGN_CONTACTS_BULK,
  CONTACTS_PAGE,
  CONTACTS_VIEW_COUNTS,
  USERS_LIST,
  type Contact,
  type UserRef,
} from "../lib/queries/crm";
import { useAuth } from "../store/auth";
import { ContactForm } from "../components/crm/ContactForm";
import {
  CONTACT_STAGE_LABELS,
  CONTACT_STAGE_STYLES,
  formatCount,
} from "../components/crm/labels";
import { Avatar, Badge, EmptyState, ErrorState } from "../components/crm/ui";
import {
  FilterPill,
  Pagination,
  SearchBox,
  SelectionBar,
  ViewTabs,
  type ViewTab,
} from "../components/crm/listview";

type ViewId = "all" | "mine" | "unassigned";

interface PageResult {
  contacts: Contact[];
  filtered: { aggregate: { count: number } };
}

interface ViewCounts {
  all: { aggregate: { count: number } };
  mine: { aggregate: { count: number } };
  unassigned: { aggregate: { count: number } };
}

function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Contacts() {
  const queryClient = useQueryClient();
  const me = useAuth((s) => s.user);

  const [showForm, setShowForm] = useState(false);
  const [view, setView] = useState<ViewId>("all");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [stage, setStage] = useState("");
  const [owner, setOwner] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // debounce da busca
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  // qualquer mudança de filtro volta para a primeira página e limpa seleção
  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [view, debounced, stage, owner, perPage]);

  const { data: usersData } = useQuery({
    queryKey: ["users-mini"],
    queryFn: () => gqlClient.request<{ users: UserRef[] }>(USERS_LIST),
  });

  const { data: counts } = useQuery({
    queryKey: ["contacts-view-counts", me?.id],
    queryFn: () =>
      gqlClient.request<ViewCounts>(CONTACTS_VIEW_COUNTS, {
        me: me?.id ?? null,
      }),
    enabled: !!me,
  });

  const where = useMemo(() => {
    const w: Record<string, unknown> = { archived: { _eq: false } };
    if (view === "mine" && me) w.responsible_id = { _eq: me.id };
    else if (view === "unassigned") w.responsible_id = { _is_null: true };
    else if (owner) w.responsible_id = { _eq: owner };
    if (stage) w.stage = { _eq: stage };
    if (debounced) {
      w._or = [
        { full_name: { _ilike: `%${debounced}%` } },
        { email: { _ilike: `%${debounced}%` } },
        { phone: { _ilike: `%${debounced}%` } },
      ];
    }
    return w;
  }, [view, owner, stage, debounced, me]);

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ["contacts-page", where, page, perPage],
    queryFn: () =>
      gqlClient.request<PageResult>(CONTACTS_PAGE, {
        where,
        limit: perPage,
        offset: (page - 1) * perPage,
        order_by: [{ created_at: "desc" }],
      }),
  });

  const total = data?.filtered.aggregate.count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / perPage));
  const rows = data?.contacts ?? [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["contacts-page"] });
    queryClient.invalidateQueries({ queryKey: ["contacts-view-counts"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const archiveBulk = useMutation({
    mutationFn: async (ids: string[]) => {
      await gqlClient.request(ARCHIVE_CONTACTS_BULK, { ids });
      await Promise.all(
        ids.map((cid) =>
          logActivity({ title: "Contato arquivado", link: { contactId: cid } })
        )
      );
    },
    onSuccess: (_d, ids) => {
      invalidate();
      setSelected(new Set());
      toast.success(
        `${ids.length} contato${ids.length > 1 ? "s" : ""} arquivado${ids.length > 1 ? "s" : ""}`
      );
    },
    onError: () => toast.error("Erro ao arquivar contatos"),
  });

  const assignBulk = useMutation({
    mutationFn: async (vars: {
      ids: string[];
      responsible_id: string | null;
    }) => {
      await gqlClient.request(ASSIGN_CONTACTS_BULK, vars);
      await Promise.all(
        vars.ids.map((cid) =>
          logActivity({
            title: "Proprietário do contato atualizado",
            link: { contactId: cid },
          })
        )
      );
    },
    onSuccess: () => {
      invalidate();
      setSelected(new Set());
      toast.success("Proprietário atualizado");
    },
    onError: () => toast.error("Erro ao atribuir contatos"),
  });

  // seleção
  const allOnPageSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const someOnPageSelected = rows.some((r) => selected.has(r.id));
  const headerRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (headerRef.current)
      headerRef.current.indeterminate = someOnPageSelected && !allOnPageSelected;
  }, [someOnPageSelected, allOnPageSelected]);

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) rows.forEach((r) => next.delete(r.id));
      else rows.forEach((r) => next.add(r.id));
      return next;
    });
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const tabs: ViewTab[] = [
    {
      id: "all",
      label: "Todos os contatos",
      count: counts ? formatCount(counts.all.aggregate.count) : undefined,
    },
    { id: "mine", label: "Meus contatos", count: counts?.mine.aggregate.count },
    {
      id: "unassigned",
      label: "Contatos não atribuídos",
      count: counts?.unassigned.aggregate.count,
    },
  ];

  const ownerOptions = (usersData?.users ?? []).map((u) => ({
    value: u.id,
    label: u.name,
  }));

  return (
    <div className="flex h-full flex-col">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-slate-900">Contatos</h1>
          {counts && (
            <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
              {formatCount(counts.all.aggregate.count)}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          <Plus size={16} /> Adicionar contatos
        </button>
      </div>

      {/* Abas de visões */}
      <ViewTabs
        tabs={tabs}
        activeId={view}
        onSelect={(id) => setView(id as ViewId)}
      />

      {/* Conteúdo scrollável */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-3 p-5">
          {/* Busca + filtros rápidos por coluna */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-[260px] flex-1">
              <SearchBox value={search} onChange={setSearch} />
            </div>
            {view === "all" && (
              <FilterPill
                label="Proprietário do contato"
                value={owner}
                onChange={setOwner}
                options={ownerOptions}
              />
            )}
            <FilterPill
              label="Status do lead"
              value={stage}
              onChange={setStage}
              options={Object.entries(CONTACT_STAGE_LABELS).map(([v, l]) => ({
                value: v,
                label: l,
              }))}
            />
            {isFetching && (
              <Loader2 size={15} className="animate-spin text-slate-400" />
            )}
          </div>

          {/* Barra de seleção em massa */}
          {selected.size > 0 && (
            <SelectionBar count={selected.size} onClear={() => setSelected(new Set())}>
              <button
                onClick={() => archiveBulk.mutate([...selected])}
                disabled={archiveBulk.isPending}
                className="flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
              >
                <Archive size={14} /> Arquivar
              </button>
              <div className="flex items-center gap-1.5 rounded-md bg-white px-2 py-1 shadow-sm">
                <UserCheck size={14} className="text-slate-500" />
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const v = e.target.value;
                    assignBulk.mutate({
                      ids: [...selected],
                      responsible_id: v || null,
                    });
                    e.target.value = "";
                  }}
                  className="bg-transparent py-0.5 text-sm text-slate-700 outline-none"
                >
                  <option value="" disabled>
                    Atribuir a...
                  </option>
                  <option value="">— Remover proprietário —</option>
                  {ownerOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </SelectionBar>
          )}

          {/* Tabela */}
          {error ? (
            <ErrorState label="Erro ao carregar contatos." />
          ) : isLoading ? (
            <div className="flex items-center gap-2 py-10 text-slate-500">
              <Loader2 className="animate-spin" size={18} /> Carregando...
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              title="Nenhum contato encontrado"
              description="Ajuste os filtros ou adicione um novo contato."
              action={
                <button
                  onClick={() => setShowForm(true)}
                  className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
                >
                  <Plus size={16} /> Adicionar contatos
                </button>
              }
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="w-10 px-4 py-2.5">
                        <input
                          ref={headerRef}
                          type="checkbox"
                          checked={allOnPageSelected}
                          onChange={toggleAll}
                          className="h-4 w-4 cursor-pointer rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </th>
                      <th className="px-4 py-2.5">Nome</th>
                      <th className="px-4 py-2.5">Proprietário do contato</th>
                      <th className="px-4 py-2.5">Data de criação</th>
                      <th className="px-4 py-2.5">E-mail</th>
                      <th className="px-4 py-2.5">Telefone</th>
                      <th className="px-4 py-2.5">Status do lead</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((c) => {
                      const checked = selected.has(c.id);
                      return (
                        <tr
                          key={c.id}
                          className={`transition ${
                            checked ? "bg-indigo-50/50" : "hover:bg-slate-50"
                          }`}
                        >
                          <td className="px-4 py-2">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleOne(c.id)}
                              className="h-4 w-4 cursor-pointer rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <Link
                              to={`/contatos/${c.id}`}
                              className="flex items-center gap-2.5"
                            >
                              <Avatar name={c.full_name} size={28} />
                              <div className="min-w-0">
                                <p className="truncate font-medium text-indigo-700 hover:underline">
                                  {c.full_name}
                                </p>
                                {c.job_title && (
                                  <p className="truncate text-xs text-slate-400">
                                    {c.job_title}
                                  </p>
                                )}
                              </div>
                            </Link>
                          </td>
                          <td className="px-4 py-2 text-slate-600">
                            {c.responsible ? (
                              <span className="flex items-center gap-1.5">
                                <Avatar
                                  name={c.responsible.name}
                                  url={c.responsible.avatar_url}
                                  size={20}
                                />
                                <span className="truncate">
                                  {c.responsible.name}
                                </span>
                              </span>
                            ) : (
                              <span className="text-slate-400">
                                Nenhum proprietário
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-slate-500">
                            {formatDateTime(c.created_at)}
                          </td>
                          <td className="px-4 py-2 text-slate-600">
                            {c.email ? (
                              <span className="flex items-center gap-1.5">
                                <Mail size={13} className="text-slate-400" />
                                <span className="truncate">{c.email}</span>
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-slate-600">
                            {c.phone ? (
                              <span className="flex items-center gap-1.5">
                                <Phone size={13} className="text-slate-400" />
                                {c.phone}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-4 py-2">
                            <Badge className={CONTACT_STAGE_STYLES[c.stage]}>
                              {CONTACT_STAGE_LABELS[c.stage]}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={page}
                pageCount={pageCount}
                perPage={perPage}
                perPageOptions={[25, 50, 100]}
                onPageChange={(p) => setPage(Math.min(Math.max(1, p), pageCount))}
                onPerPageChange={setPerPage}
              />
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <ContactForm onClose={() => setShowForm(false)} onSaved={invalidate} />
      )}
    </div>
  );
}
