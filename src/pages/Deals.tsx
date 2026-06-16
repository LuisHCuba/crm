import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, LayoutGrid, Table as TableIcon, Loader2, Archive } from "lucide-react";
import { toast } from "sonner";
import { gqlClient } from "../lib/graphql";
import { logActivity } from "../lib/activity-log";
import {
  ARCHIVE_DEALS_BULK,
  PROMOTE_DEAL_CONTACTS_ACTIVE_CLIENT,
  DEAL_BOARD_META,
  DEALS_BY_PIPELINE,
  DEALS_PAGE,
  DEALS_TOTAL_COUNT,
  UPDATE_DEAL,
  USERS_LIST,
  type DealListItem,
  type Pipeline,
  type Stage,
  type UserRef,
} from "../lib/queries/crm";
import { formatCount } from "../components/crm/labels";
import { EmptyState, ErrorState } from "../components/crm/ui";
import {
  FilterPill,
  SearchBox,
  SelectionBar,
  ViewTabs,
  type ViewTab,
} from "../components/crm/listview";
import { DealForm } from "../components/crm/DealForm";
import {
  CloseDealModal,
  type CloseDealResult,
} from "../components/crm/CloseDealModal";
import { DealBoard } from "../components/crm/deal-board/DealBoard";
import { DealTable } from "../components/crm/deal-board/DealTable";
import {
  DateRangePill,
  datePresetToRange,
  type DatePreset,
} from "../components/crm/deal-board/filters";

type View = "board" | "table";
const VIEW_KEY = "crm-lhcx-deals-view";

function loadView(): View {
  const v = localStorage.getItem(VIEW_KEY);
  return v === "table" ? "table" : "board";
}

const BOARD_CARD_CAP = 500;

interface MetaData {
  pipelines: Pipeline[];
  pipeline_stages: Stage[];
}
interface BoardData {
  deals: DealListItem[];
}
interface PageData {
  deals: DealListItem[];
  filtered: { aggregate: { count: number } };
}
interface TotalCount {
  deals_aggregate: { aggregate: { count: number } };
}

export default function Deals() {
  const queryClient = useQueryClient();

  const [view, setView] = useState<View>(loadView);
  const [showForm, setShowForm] = useState(false);
  const [pipelineId, setPipelineId] = useState("");

  // filtros
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [owner, setOwner] = useState("");
  const [createdPreset, setCreatedPreset] = useState<DatePreset>("");
  const [activityPreset, setActivityPreset] = useState<DatePreset>("");
  const [closedPreset, setClosedPreset] = useState<DatePreset>("");

  // tabela
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // arrastar e soltar
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);
  const [closing, setClosing] = useState<{
    deal: DealListItem;
    stage: Stage;
  } | null>(null);

  useEffect(() => {
    localStorage.setItem(VIEW_KEY, view);
  }, [view]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [debounced, owner, createdPreset, activityPreset, closedPreset, perPage, pipelineId]);

  const { data: usersData } = useQuery({
    queryKey: ["users-mini"],
    queryFn: () => gqlClient.request<{ users: UserRef[] }>(USERS_LIST),
  });

  const { data: meta, isLoading: metaLoading } = useQuery({
    queryKey: ["deals-meta"],
    queryFn: () => gqlClient.request<MetaData>(DEAL_BOARD_META),
  });

  const { data: totalCount } = useQuery({
    queryKey: ["deals-total"],
    queryFn: () => gqlClient.request<TotalCount>(DEALS_TOTAL_COUNT),
  });

  const pipelines = meta?.pipelines ?? [];
  const activePipeline = pipelineId || pipelines[0]?.id || "";

  const stages = useMemo(
    () =>
      (meta?.pipeline_stages ?? [])
        .filter((s) => s.pipeline_id === activePipeline)
        .sort((a, b) => a.order - b.order),
    [meta, activePipeline]
  );

  const where = useMemo(() => {
    const w: Record<string, unknown> = { archived: { _eq: false } };
    if (activePipeline) w.pipeline_id = { _eq: activePipeline };
    if (owner === "__none") w.responsible_id = { _is_null: true };
    else if (owner) w.responsible_id = { _eq: owner };
    if (debounced) w.title = { _ilike: `%${debounced}%` };
    const created = datePresetToRange(createdPreset);
    if (created) w.created_at = created;
    const closed = datePresetToRange(closedPreset);
    if (closed) w.closed_at = closed;
    const act = datePresetToRange(activityPreset);
    if (act) w.activities = { created_at: act };
    return w;
  }, [activePipeline, owner, debounced, createdPreset, closedPreset, activityPreset]);

  const boardKey = ["deals-board", where] as const;

  const boardQuery = useQuery({
    queryKey: boardKey,
    queryFn: () =>
      gqlClient.request<BoardData>(DEALS_BY_PIPELINE, {
        where,
        limit: BOARD_CARD_CAP,
      }),
    enabled: view === "board" && !!activePipeline,
  });

  const tableQuery = useQuery({
    queryKey: ["deals-page", where, page, perPage],
    queryFn: () =>
      gqlClient.request<PageData>(DEALS_PAGE, {
        where,
        limit: perPage,
        offset: (page - 1) * perPage,
        order_by: [{ created_at: "desc" }],
      }),
    enabled: view === "table",
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["deals-board"] });
    queryClient.invalidateQueries({ queryKey: ["deals-page"] });
    queryClient.invalidateQueries({ queryKey: ["deals-total"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const moveMutation = useMutation({
    mutationFn: (vars: { id: string; set: Record<string, unknown> }) =>
      gqlClient.request(UPDATE_DEAL, vars),
    onMutate: async ({ id, set }) => {
      await queryClient.cancelQueries({ queryKey: boardKey });
      const prev = queryClient.getQueryData<BoardData>(boardKey);
      if (prev) {
        queryClient.setQueryData<BoardData>(boardKey, {
          deals: prev.deals.map((d) =>
            d.id === id ? { ...d, ...(set as Partial<DealListItem>) } : d
          ),
        });
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(boardKey, ctx.prev);
      toast.error("Erro ao mover negócio");
    },
    onSettled: () => {
      invalidate();
      setClosing(null);
    },
  });

  const applyMove = (deal: DealListItem, stage: Stage, extra?: CloseDealResult) => {
    const set: Record<string, unknown> = { stage_id: stage.id };
    if (stage.type === "won" || stage.type === "lost") {
      set.closed_at = extra?.closed_at ?? new Date().toISOString();
      set.loss_reason =
        stage.type === "lost" ? extra?.loss_reason ?? "other" : null;
    } else {
      set.closed_at = null;
      set.loss_reason = null;
    }
    moveMutation.mutate({ id: deal.id, set });

    // Auditoria + automação de ciclo de vida (estilo HubSpot).
    void logActivity({
      title: `Negócio movido para "${stage.name}"`,
      link: { dealId: deal.id, companyId: deal.company?.id ?? undefined },
    });
    if (stage.type === "won") {
      void logActivity({
        title: "Negócio marcado como GANHO",
        link: { dealId: deal.id },
      });
      void gqlClient
        .request<{ update_contacts: { returning: { id: string }[] } }>(
          PROMOTE_DEAL_CONTACTS_ACTIVE_CLIENT,
          { dealId: deal.id }
        )
        .then((res) =>
          Promise.all(
            res.update_contacts.returning.map((c) =>
              logActivity({
                title: "Contato promovido a Cliente ativo (negócio ganho)",
                link: { contactId: c.id, dealId: deal.id },
              })
            )
          )
        )
        .catch((e) =>
          console.error("Falha na automação de ciclo de vida:", e)
        );
    } else if (stage.type === "lost") {
      void logActivity({
        title: "Negócio marcado como PERDIDO",
        link: { dealId: deal.id },
      });
    }
  };

  const onMoveRequest = (deal: DealListItem, stage: Stage) => {
    if (stage.type === "won" || stage.type === "lost") {
      setClosing({ deal, stage });
    } else {
      applyMove(deal, stage);
    }
  };

  const archiveBulk = useMutation({
    mutationFn: async (ids: string[]) => {
      await gqlClient.request(ARCHIVE_DEALS_BULK, { ids });
      await Promise.all(
        ids.map((did) =>
          logActivity({ title: "Negócio arquivado", link: { dealId: did } })
        )
      );
    },
    onSuccess: (_d, ids) => {
      invalidate();
      setSelected(new Set());
      toast.success(
        `${ids.length} negócio${ids.length > 1 ? "s" : ""} arquivado${ids.length > 1 ? "s" : ""}`
      );
    },
    onError: () => toast.error("Erro ao arquivar negócios"),
  });

  const rows = tableQuery.data?.deals ?? [];
  const total = tableQuery.data?.filtered.aggregate.count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / perPage));

  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      const all = rows.length > 0 && rows.every((r) => next.has(r.id));
      if (all) rows.forEach((r) => next.delete(r.id));
      else rows.forEach((r) => next.add(r.id));
      return next;
    });

  const tabs: ViewTab[] = [
    {
      id: "all",
      label: "Todos os negócios",
      count: totalCount
        ? formatCount(totalCount.deals_aggregate.aggregate.count)
        : undefined,
    },
  ];

  const ownerOptions = [
    { value: "__none", label: "Nenhum proprietário" },
    ...(usersData?.users ?? []).map((u) => ({ value: u.id, label: u.name })),
  ];

  const isFetching = view === "board" ? boardQuery.isFetching : tableQuery.isFetching;
  const isLoading =
    metaLoading || (view === "board" ? boardQuery.isLoading : tableQuery.isLoading);
  const error = view === "board" ? boardQuery.error : tableQuery.error;
  const boardDeals = boardQuery.data?.deals ?? [];
  const isEmpty =
    !isLoading &&
    !error &&
    (view === "board" ? boardDeals.length === 0 : rows.length === 0);

  return (
    <div className="flex h-full flex-col">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-slate-900">Negócios</h1>
          {totalCount && (
            <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
              {formatCount(totalCount.deals_aggregate.aggregate.count)}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          <Plus size={16} /> Adicionar negócio
        </button>
      </div>

      <ViewTabs tabs={tabs} activeId="all" onSelect={() => {}} />

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-3 p-5">
          {/* Toolbar: busca + alternador de visão */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-[260px] flex-1">
              <SearchBox value={search} onChange={setSearch} />
            </div>
            {isFetching && (
              <Loader2 size={15} className="animate-spin text-slate-400" />
            )}
            <div className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white p-1">
              <button
                onClick={() => setView("board")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  view === "board"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                <LayoutGrid size={15} /> Quadro
              </button>
              <button
                onClick={() => setView("table")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  view === "table"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                <TableIcon size={15} /> Tabela
              </button>
            </div>
          </div>

          {/* Pipelines (apenas se houver mais de um) */}
          {pipelines.length > 1 && (
            <div className="flex flex-wrap items-center gap-1">
              {pipelines.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPipelineId(p.id)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    p.id === activePipeline
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}

          {/* Filtros funcionais */}
          <div className="flex flex-wrap items-center gap-2">
            <FilterPill
              label="Proprietário do negócio"
              value={owner}
              onChange={setOwner}
              options={ownerOptions}
            />
            <DateRangePill
              label="Data de criação"
              value={createdPreset}
              onChange={setCreatedPreset}
            />
            <DateRangePill
              label="Data da última atividade"
              value={activityPreset}
              onChange={setActivityPreset}
            />
            <DateRangePill
              label="Data de fechamento"
              value={closedPreset}
              onChange={setClosedPreset}
            />
          </div>

          {/* Barra de seleção em massa (tabela) */}
          {view === "table" && selected.size > 0 && (
            <SelectionBar count={selected.size} onClear={() => setSelected(new Set())}>
              <button
                onClick={() => archiveBulk.mutate([...selected])}
                disabled={archiveBulk.isPending}
                className="flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
              >
                <Archive size={14} /> Arquivar
              </button>
            </SelectionBar>
          )}

          {/* Conteúdo */}
          {error ? (
            <ErrorState label="Erro ao carregar negócios." />
          ) : isLoading ? (
            <div className="flex items-center gap-2 py-10 text-slate-500">
              <Loader2 className="animate-spin" size={18} /> Carregando...
            </div>
          ) : isEmpty ? (
            <EmptyState
              title="Nenhum negócio encontrado"
              description="Ajuste os filtros ou adicione um novo negócio."
              action={
                <button
                  onClick={() => setShowForm(true)}
                  className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
                >
                  <Plus size={16} /> Adicionar negócio
                </button>
              }
            />
          ) : view === "board" ? (
            <DealBoard
              stages={stages}
              deals={boardDeals}
              onMoveRequest={onMoveRequest}
              dragId={dragId}
              onDragChange={setDragId}
              overStage={overStage}
              onOverStage={setOverStage}
            />
          ) : (
            <DealTable
              rows={rows}
              selected={selected}
              onToggleOne={toggleOne}
              onToggleAll={toggleAll}
              page={page}
              pageCount={pageCount}
              perPage={perPage}
              onPageChange={(p) => setPage(Math.min(Math.max(1, p), pageCount))}
              onPerPageChange={setPerPage}
            />
          )}
        </div>
      </div>

      {showForm && (
        <DealForm onClose={() => setShowForm(false)} onSaved={() => invalidate()} />
      )}

      {closing && (
        <CloseDealModal
          type={closing.stage.type as "won" | "lost"}
          stageName={closing.stage.name}
          loading={moveMutation.isPending}
          onClose={() => setClosing(null)}
          onConfirm={(result) => applyMove(closing.deal, closing.stage, result)}
        />
      )}
    </div>
  );
}
