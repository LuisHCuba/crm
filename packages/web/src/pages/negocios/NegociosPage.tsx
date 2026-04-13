import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Briefcase, GripVertical, LayoutGrid, List, Plus } from "lucide-react";
import { toast } from "sonner";
import { api, extractData, formatMutationError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/format";
import { useUserOptions } from "@/lib/use-options";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { NegocioForm } from "./NegocioForm";
import { GenerateReceivablesModal } from "./GenerateReceivablesModal";
import { LossReasonModal } from "./LossReasonModal";
import { ProtectionModal } from "./ProtectionModal";

type Deal = {
  id: string;
  title: string;
  companyId: string | null;
  pipelineId: string;
  stageId: string;
  totalValue: string | null;
  forecastDate: string | null;
  responsibleId: string;
  lossReason: string | null;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
};

type StageWithDeals = {
  id: string;
  name: string;
  type: "open" | "won" | "lost";
  order: number;
  deals: Deal[];
  totalValue: string;
  count: number;
};

type Pipeline = { id: string; name: string; active: boolean };

const STAGE_BADGE: Record<string, "info" | "success" | "danger"> = {
  open: "info",
  won: "success",
  lost: "danger",
};

function KanbanCard({
  deal,
  companyName,
  overlay,
  onOpenDeal,
}: {
  deal: Deal;
  companyName: string;
  overlay?: boolean;
  /** Abrir ficha do negócio (só no card normal; overlay não usa) */
  onOpenDeal?: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: deal.id, data: { deal } });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  if (overlay) {
    return (
      <div className="rounded-lg border border-[var(--color-accent)] bg-[var(--color-surface)] p-3 shadow-lg">
        <p className="text-sm font-medium text-[var(--color-text)]">{deal.title}</p>
        <p className="mt-0.5 text-xs text-[var(--color-muted)]">{companyName}</p>
        <p className="mt-1 text-sm font-semibold text-[var(--color-accent)]">
          {formatCurrency(deal.totalValue)}
        </p>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2 transition-shadow hover:shadow-md",
        isDragging && "opacity-40",
      )}
    >
      <div className="flex gap-1.5">
        <button
          type="button"
          className="mt-0.5 shrink-0 cursor-grab touch-none rounded p-0.5 text-[var(--color-muted)] hover:bg-[var(--color-border)] hover:text-[var(--color-text)]"
          aria-label="Arrastar negócio"
          {...listeners}
          {...attributes}
        >
          <GripVertical className="size-4" />
        </button>
        <button
          type="button"
          className="min-w-0 flex-1 cursor-pointer rounded-md text-left outline-none ring-offset-2 ring-offset-[var(--color-surface)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          onClick={() => onOpenDeal?.(deal.id)}
        >
          <p className="text-sm font-medium text-[var(--color-text)]">{deal.title}</p>
          <p className="mt-0.5 text-xs text-[var(--color-muted)]">{companyName}</p>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-[var(--color-accent)]">
              {formatCurrency(deal.totalValue)}
            </span>
            <span className="flex size-7 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-[10px] font-bold text-[var(--color-accent)]">
              {(companyName?.[0] ?? "?").toUpperCase()}
            </span>
          </div>
        </button>
      </div>
    </div>
  );
}

function KanbanColumn({
  stage,
  companyMap,
  onOpenDeal,
}: {
  stage: StageWithDeals;
  companyMap: Map<string, string>;
  onOpenDeal: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex h-full min-h-0 w-72 shrink-0 flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] transition-colors",
        isOver && "border-[var(--color-accent)] bg-[var(--color-accent-soft)]",
      )}
    >
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-3 py-2.5">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-[var(--color-text)]">
            {stage.name}
          </h3>
          <Badge variant={STAGE_BADGE[stage.type] ?? "neutral"}>
            {stage.count}
          </Badge>
        </div>
        <span className="text-xs font-medium text-[var(--color-muted)]">
          {formatCurrency(stage.totalValue)}
        </span>
      </div>
      <div className="flex min-h-[120px] flex-1 flex-col gap-2 overflow-y-auto p-2">
        {stage.deals.map((deal) => (
          <KanbanCard
            key={deal.id}
            deal={deal}
            companyName={deal.companyId ? companyMap.get(deal.companyId) ?? "—" : "Sem empresa"}
            onOpenDeal={onOpenDeal}
          />
        ))}
      </div>
    </div>
  );
}

export function NegociosPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [selectedPipeline, setSelectedPipeline] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);

  const [lossModal, setLossModal] = useState<{ deal: Deal; stageId: string } | null>(null);
  const [receivablesModal, setReceivablesModal] = useState<{
    dealId: string;
    companyId: string | null;
    lineItems: any[];
  } | null>(null);
  const [protectionModal, setProtectionModal] = useState<{
    linkedReceivables: Array<{ id: string; description: string; value: number | string; parcelLabel: string; dueDate: string; status: string }>;
  } | null>(null);

  const userOptions = useUserOptions();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const { data: pipelines } = useQuery({
    queryKey: ["pipelines"],
    queryFn: () => api.get("/pipelines").then((r) => r.data),
  });

  const pipelineList: Pipeline[] = Array.isArray(pipelines) ? pipelines : [];
  const effectivePipeline = selectedPipeline || pipelineList[0]?.id || "";

  const { data: kanbanData, isLoading: kanbanLoading } = useQuery({
    queryKey: ["negocios", "kanban", effectivePipeline],
    queryFn: () =>
      api
        .get("/negocios", {
          params: { groupByStage: "true", pipelineId: effectivePipeline },
        })
        .then((r) => r.data),
    enabled: view === "kanban" && !!effectivePipeline,
  });

  const { data: tableData, isLoading: tableLoading } = useQuery({
    queryKey: ["negocios", "table", effectivePipeline],
    queryFn: () =>
      api
        .get("/negocios", {
          params: { pipelineId: effectivePipeline || undefined, perPage: 100 },
        })
        .then((r) => r.data),
    enabled: view === "table",
  });

  const { data: pipelineStagesRaw } = useQuery({
    queryKey: ["pipeline-stages", effectivePipeline],
    queryFn: () =>
      api.get(`/pipelines/${effectivePipeline}`).then((r) => r.data?.stages ?? []),
    enabled: !!effectivePipeline,
    staleTime: 60_000,
  });
  const pipelineStages: Array<{ id: string; name: string; type: string }> =
    pipelineStagesRaw ?? [];

  const { data: empresasRaw } = useQuery({
    queryKey: ["empresas", "all"],
    queryFn: () => api.get("/empresas?perPage=100").then((r) => extractData(r)),
  });

  const companyMap = useMemo(() => {
    const m = new Map<string, string>();
    (empresasRaw ?? []).forEach((e: any) =>
      m.set(e.id, e.tradeName || e.legalName),
    );
    return m;
  }, [empresasRaw]);

  const stages: StageWithDeals[] = kanbanData?.stages ?? [];

  const moveDeal = useMutation({
    mutationFn: (payload: { dealId: string; stageId: string; lossReason?: string }) =>
      api
        .patch(`/negocios/${payload.dealId}`, {
          stageId: payload.stageId,
          lossReason: payload.lossReason ?? undefined,
        })
        .then((r) => r.data),
    onSuccess: async (data, vars) => {
      qc.invalidateQueries({ queryKey: ["negocios"] });

      if (data.linkedReceivables?.length) {
        setProtectionModal({ linkedReceivables: data.linkedReceivables });
        return;
      }

      if (data.requiresReceivables) {
        const lineItems = await api
          .get(`/negocios/${vars.dealId}/itens`)
          .then((r) => extractData(r));

        const deal = stages
          .flatMap((s) => s.deals)
          .find((d) => d.id === vars.dealId);

        if (!deal?.companyId) {
          toast.error("Associe uma empresa ao negócio antes de gerar contas a receber");
          return;
        }

        setReceivablesModal({
          dealId: vars.dealId,
          companyId: deal.companyId,
          lineItems,
        });
      }
    },
    onError: (e) => toast.error(formatMutationError("Erro ao mover negócio", e)),
  });

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDeal(event.active.data.current?.deal ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDeal(null);
    const { active, over } = event;
    if (!over) return;

    const deal = active.data.current?.deal as Deal | undefined;
    if (!deal) return;

    const targetStageId = String(over.id);
    if (deal.stageId === targetStageId) return;

    const targetStage = stages.find((s) => s.id === targetStageId);
    if (!targetStage) return;

    if (targetStage.type === "lost") {
      setLossModal({ deal, stageId: targetStageId });
      return;
    }

    moveDeal.mutate({ dealId: deal.id, stageId: targetStageId });
  };

  const cancelReceivables = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => api.patch(`/contas-receber/${id}/cancelar`)));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["negocios"] });
      qc.invalidateQueries({ queryKey: ["contas-receber"] });
      setProtectionModal(null);
    },
    onError: (e) =>
      toast.error(formatMutationError("Erro ao cancelar contas a receber", e)),
  });

  const handleProtectionConfirm = (cancelledIds: string[]) => {
    if (cancelledIds.length === 0) {
      setProtectionModal(null);
      return;
    }
    cancelReceivables.mutate(cancelledIds);
  };

  const handleLossConfirm = (reason: string) => {
    if (!lossModal) return;
    moveDeal.mutate({
      dealId: lossModal.deal.id,
      stageId: lossModal.stageId,
      lossReason: reason,
    });
    setLossModal(null);
  };

  const pipelineOptions = pipelineList.map((p) => ({
    value: p.id,
    label: p.name,
  }));

  const tableColumns: DataTableColumn<Deal>[] = [
    { key: "title", header: "Título" },
    {
      key: "companyId",
      header: "Empresa",
      render: (row) =>
        row.companyId ? companyMap.get(row.companyId) ?? "—" : "Sem empresa",
    },
    {
      key: "totalValue",
      header: "Valor",
      render: (row) => formatCurrency(row.totalValue),
    },
    {
      key: "stageId",
      header: "Estágio",
      render: (row) => {
        const stage = pipelineStages.find((s) => s.id === row.stageId);
        return (
          <Badge variant={STAGE_BADGE[stage?.type ?? ""] ?? "neutral"}>
            {stage?.name ?? "—"}
          </Badge>
        );
      },
    },
    {
      key: "responsibleId",
      header: "Responsável",
      render: (row) =>
        userOptions.find((u) => u.value === row.responsibleId)?.label ?? "—",
    },
    {
      key: "forecastDate",
      header: "Previsão",
      render: (row) =>
        row.forecastDate
          ? new Date(row.forecastDate + "T00:00:00").toLocaleDateString("pt-BR")
          : "—",
    },
  ];

  return (
    <div
      className={cn(
        "flex flex-col",
        view === "kanban" ? "min-h-0 flex-1 gap-4" : "space-y-4",
      )}
    >
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-3",
          view === "kanban" && "shrink-0",
        )}
      >
        <div className="flex items-center gap-3">
          <Briefcase className="size-6 text-[var(--color-accent)]" />
          <h1 className="text-xl font-bold text-[var(--color-text)]">Negócios</h1>
        </div>
        <div className="flex items-center gap-2">
          <Select
            options={pipelineOptions}
            value={effectivePipeline}
            onChange={setSelectedPipeline}
            placeholder="Pipeline"
            className="w-48"
          />

          <div className="flex rounded-lg border border-[var(--color-border)]">
            <button
              type="button"
              onClick={() => setView("kanban")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-sm transition-colors",
                view === "kanban"
                  ? "bg-[var(--color-accent)] text-white"
                  : "text-[var(--color-muted)] hover:text-[var(--color-text)]",
                "rounded-l-lg",
              )}
            >
              <LayoutGrid className="size-4" />
              Kanban
            </button>
            <button
              type="button"
              onClick={() => setView("table")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-sm transition-colors",
                view === "table"
                  ? "bg-[var(--color-accent)] text-white"
                  : "text-[var(--color-muted)] hover:text-[var(--color-text)]",
                "rounded-r-lg",
              )}
            >
              <List className="size-4" />
              Tabela
            </button>
          </div>

          <Button onClick={() => setFormOpen(true)}>
            <Plus className="size-4" />
            Novo negócio
          </Button>
        </div>
      </div>

      {view === "kanban" ? (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex min-h-0 flex-1 w-full min-w-0 flex-row gap-4 overflow-x-auto overflow-y-hidden">
              {kanbanLoading ? (
                <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center py-10">
                  <p className="text-center text-[var(--color-muted)]">Carregando…</p>
                </div>
              ) : (
                stages.map((stage) => (
                  <KanbanColumn
                    key={stage.id}
                    stage={stage}
                    companyMap={companyMap}
                    onOpenDeal={(dealId) => navigate(`/negocios/${dealId}`)}
                  />
                ))
              )}
            </div>
            <DragOverlay>
              {activeDeal ? (
                <KanbanCard
                  deal={activeDeal}
                  companyName={activeDeal.companyId ? companyMap.get(activeDeal.companyId) ?? "—" : "Sem empresa"}
                  overlay
                />
              ) : null}
            </DragOverlay>
          </div>
        </DndContext>
      ) : (
        <DataTable
          columns={tableColumns}
          data={tableData?.data ?? []}
          loading={tableLoading}
          onRowClick={(row) => navigate(`/negocios/${row.id}`)}
          getRowKey={(row) => row.id}
        />
      )}

      <NegocioForm open={formOpen} onClose={() => setFormOpen(false)} />

      <LossReasonModal
        open={!!lossModal}
        onClose={() => setLossModal(null)}
        onConfirm={handleLossConfirm}
        loading={moveDeal.isPending}
      />

      {receivablesModal ? (
        <GenerateReceivablesModal
          open
          onClose={() => setReceivablesModal(null)}
          dealId={receivablesModal.dealId}
          companyId={receivablesModal.companyId}
          lineItems={receivablesModal.lineItems}
        />
      ) : null}

      <ProtectionModal
        open={!!protectionModal}
        onClose={() => setProtectionModal(null)}
        linkedReceivables={protectionModal?.linkedReceivables ?? []}
        onConfirm={handleProtectionConfirm}
        loading={cancelReceivables.isPending}
      />
    </div>
  );
}
