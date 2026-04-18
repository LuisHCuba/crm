import { useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Archive,
  Receipt,
  Building2,
  Users,
  ShoppingCart,
  FolderKanban,
  CreditCard,
  Activity,
} from "lucide-react";
import { toast } from "sonner";
import { api, extractData, formatMutationError } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Tabs } from "@/components/ui/Tabs";
import { Modal } from "@/components/ui/Modal";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { AssociationCard } from "@/components/ui/AssociationCard";
import { EditableField } from "@/components/ui/EditableField";
import { PipelineTracker } from "@/components/ui/PipelineTracker";
import { GenerateReceivablesModal } from "./GenerateReceivablesModal";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { AuditHistory } from "@/components/AuditHistory";
import {
  useUserOptions,
  usePipelineOptions,
  usePipelineStageOptions,
} from "@/lib/use-options";
import { AsyncCombobox } from "@/components/ui/AsyncCombobox";

type DealDetail = {
  id: string;
  title: string;
  companyId: string | null;
  pipelineId: string;
  stageId: string;
  totalValue: string | null;
  forecastDate: string | null;
  responsibleId: string;
  lossReason: string | null;
  company: { id: string; legalName: string; tradeName?: string | null } | null;
  pipeline?: { id: string; name: string } | null;
  pipelineName?: string;
  stage: { id: string; name: string; type: string } | null;
  lineItems: LineItem[];
  contacts: DealContact[];
};

type DealContact = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
};

type LineItem = {
  id: string;
  dealId: string;
  productId: string;
  quantity: number;
  unitPrice: string;
  discountPercent: string | null;
  subtotal: string;
};

const STAGE_VARIANT: Record<string, "info" | "success" | "danger"> = {
  open: "info",
  won: "success",
  lost: "danger",
};

const LOSS_OPTIONS = [
  { value: "price", label: "Preço" },
  { value: "competition", label: "Concorrência" },
  { value: "timing", label: "Timing" },
  { value: "no_response", label: "Sem resposta" },
  { value: "other", label: "Outro" },
];

const STATUS_VARIANT: Record<string, "warning" | "success" | "danger" | "neutral"> = {
  pending: "warning",
  paid: "success",
  overdue: "danger",
  cancelled: "neutral",
};

const TABS = [
  { id: "activities", label: "Atividades" },
  { id: "history", label: "Histórico" },
];

const lineItemSchema = z.object({
  productId: z.string().min(1, "Produto obrigatório"),
  quantity: z.coerce.number().int().min(1),
  unitPrice: z.string().min(1, "Preço obrigatório"),
  discountPercent: z.string().default("0"),
});
type LineItemForm = z.infer<typeof lineItemSchema>;

export function NegocioDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState("activities");
  const [addingItem, setAddingItem] = useState(false);
  const [linkContactOpen, setLinkContactOpen] = useState(false);
  const [contactIdToLink, setContactIdToLink] = useState("");
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [receivablesModal, setReceivablesModal] = useState<{
    dealId: string;
    companyId: string | null;
    lineItems: any[];
  } | null>(null);

  const userOptions = useUserOptions();
  const pipelineOptions = usePipelineOptions();

  const searchUsers = useCallback(
    async (q: string) => {
      const res = await api.get("/auth/users");
      const all = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      return all
        .filter((u: any) => u.name?.toLowerCase().includes(q.toLowerCase()))
        .map((u: any) => ({ value: u.id, label: u.name }));
    },
    [],
  );

  const searchCompanies = useCallback(
    async (q: string) => {
      const res = await api.get("/empresas", { params: { search: q, perPage: 20 } });
      const all = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      return all.map((c: any) => ({
        value: c.id,
        label: c.tradeName?.trim() || c.legalName,
      }));
    },
    [],
  );

  const searchContacts = useCallback(
    async (q: string) => {
      const res = await api.get("/contatos", { params: { search: q, perPage: 20 } });
      const all = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      return all.map((c: any) => ({ value: c.id, label: c.fullName }));
    },
    [],
  );

  const { data: deal, isLoading } = useQuery<DealDetail>({
    queryKey: ["negocios", id],
    queryFn: () => api.get(`/negocios/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const stageOptions = usePipelineStageOptions(deal?.pipelineId);

  const { data: pipelineStages } = useQuery<any[]>({
    queryKey: ["pipeline-stages-detail", deal?.pipelineId],
    queryFn: () =>
      api.get(`/pipelines/${deal!.pipelineId}`).then((r) => r.data?.stages ?? []),
    enabled: !!deal?.pipelineId,
    staleTime: 60_000,
  });

  const { data: products } = useQuery({
    queryKey: ["produtos", "all"],
    queryFn: () => api.get("/produtos?perPage=100").then((r) => extractData(r)),
  });

  const { data: receivables } = useQuery({
    queryKey: ["contas-receber", "deal", id],
    queryFn: () =>
      api.get(`/contas-receber?dealId=${id}`).then((r) => {
        const d = r.data;
        return Array.isArray(d) ? d : d?.data ?? [];
      }),
    enabled: !!id,
  });

  const { data: projectsRaw } = useQuery({
    queryKey: ["projetos", "deal", id],
    queryFn: () => api.get("/projetos?perPage=100").then((r) => extractData(r)),
    enabled: !!id,
  });

  const { data: activitiesRaw } = useQuery({
    queryKey: ["atividades-preview", "deal", id],
    queryFn: () =>
      api.get("/atividades", { params: { linkedDealId: id, perPage: 5 } }).then((r) => {
        const d = r.data;
        return Array.isArray(d) ? d : d?.data ?? [];
      }),
    enabled: !!id,
  });

  const productMap = new Map<string, string>(
    (products ?? []).map((p: any) => [p.id, p.name]),
  );

  const {
    register,
    handleSubmit,
    reset: resetLineForm,
    watch,
    formState: { errors: lineErrors },
  } = useForm({
    resolver: zodResolver(lineItemSchema) as any,
    defaultValues: { productId: "", quantity: 1, unitPrice: "", discountPercent: "0" },
  });

  /* Inline patch for any deal field */
  const patchDeal = useMutation({
    mutationFn: (patch: Record<string, unknown>) =>
      api.patch(`/negocios/${id}`, patch).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["negocios", id] });
    },
    onError: (e) => toast.error(formatMutationError("Erro ao salvar", e)),
  });

  const addLineItem = useMutation({
    mutationFn: (data: LineItemForm) =>
      api.post(`/negocios/${id}/itens`, data).then((r) => r.data),
    onSuccess: () => {
      toast.success("Item adicionado");
      qc.invalidateQueries({ queryKey: ["negocios", id] });
      setAddingItem(false);
      resetLineForm();
    },
    onError: (e) => toast.error(formatMutationError("Erro ao adicionar item", e)),
  });

  const deleteLineItem = useMutation({
    mutationFn: (itemId: string) => api.delete(`/negocios/${id}/itens/${itemId}`),
    onSuccess: () => {
      toast.success("Item removido");
      qc.invalidateQueries({ queryKey: ["negocios", id] });
    },
    onError: (e) => toast.error(formatMutationError("Erro ao remover item", e)),
  });

  const linkContact = useMutation({
    mutationFn: (contactId: string) =>
      api.post(`/negocios/${id}/contatos`, { contactId }),
    onSuccess: () => {
      toast.success("Contato vinculado");
      qc.invalidateQueries({ queryKey: ["negocios", id] });
      setLinkContactOpen(false);
      setContactIdToLink("");
    },
    onError: (e) => toast.error(formatMutationError("Erro ao vincular", e)),
  });

  const unlinkContact = useMutation({
    mutationFn: (contactId: string) =>
      api.delete(`/negocios/${id}/contatos/${contactId}`),
    onSuccess: () => {
      toast.success("Contato desvinculado");
      qc.invalidateQueries({ queryKey: ["negocios", id] });
    },
    onError: (e) => toast.error(formatMutationError("Erro ao desvincular", e)),
  });

  const archiveMutation = useMutation({
    mutationFn: () => api.delete(`/negocios/${id}`),
    onSuccess: () => {
      toast.success("Negócio arquivado");
      qc.invalidateQueries({ queryKey: ["negocios"] });
      navigate("/negocios");
    },
    onError: (e) => toast.error(formatMutationError("Erro ao arquivar", e)),
  });

  if (isLoading) {
    return <p className="py-20 text-center text-[var(--color-muted)]">Carregando…</p>;
  }
  if (!deal) {
    return <p className="py-20 text-center text-[var(--color-muted)]">Negócio não encontrado.</p>;
  }

  const responsibleName =
    userOptions.find((u) => u.value === deal.responsibleId)?.label ?? "—";
  const companyLabel = deal.company
    ? deal.company.tradeName?.trim() || deal.company.legalName?.trim() || "—"
    : "Sem empresa";
  const dealProjects = (projectsRaw ?? []).filter((p: any) => p.dealId === id);
  const productOptions = (products ?? []).map((p: any) => ({
    value: p.id,
    label: p.name,
  }));
  const lossLabel =
    LOSS_OPTIONS.find((o) => o.value === deal.lossReason)?.label ?? deal.lossReason;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/negocios")}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-bold text-[var(--color-text)]">
              {deal.title}
            </h1>
            <Badge variant={STAGE_VARIANT[deal.stage?.type ?? ""] ?? "neutral"}>
              {deal.stage?.name ?? "—"}
            </Badge>
          </div>
        </div>
      </div>

      {/* 3-column grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[15rem_1fr_17rem]">
        {/* ========== LEFT SIDEBAR ========== */}
        <aside className="flex flex-col gap-4 lg:self-start">
          {/* Pipeline tracker */}
          {pipelineStages && pipelineStages.length > 0 && (
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
              <PipelineTracker
                stages={pipelineStages}
                currentStageId={deal.stageId}
              />
            </div>
          )}

          {/* Editable properties */}
          <div className="flex flex-col gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
            <div className="text-center">
              <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
                Valor total
              </span>
              <p className="text-2xl font-bold text-[var(--color-text)]">
                {formatCurrency(deal.totalValue)}
              </p>
            </div>

            <hr className="border-[var(--color-border)]" />

            <EditableField
              type="text"
              label="Título"
              value={deal.title}
              onSave={(v) => patchDeal.mutate({ title: v })}
            />

            <EditableField
              type="select"
              label="Pipeline"
              value={deal.pipelineId}
              displayValue={deal.pipeline?.name ?? deal.pipelineName ?? "—"}
              options={pipelineOptions}
              onSave={(v) => patchDeal.mutate({ pipelineId: v })}
            />

            <EditableField
              type="select"
              label="Estágio"
              value={deal.stageId}
              displayValue={deal.stage?.name ?? "—"}
              options={stageOptions}
              onSave={(v) => patchDeal.mutate({ stageId: v })}
            />

            <EditableField
              type="search"
              label="Responsável"
              value={deal.responsibleId}
              displayValue={responsibleName}
              searchFn={searchUsers}
              onSave={(v) => patchDeal.mutate({ responsibleId: v })}
            />

            <EditableField
              type="search"
              label="Empresa"
              value={deal.companyId ?? ""}
              displayValue={companyLabel}
              searchFn={searchCompanies}
              onSave={(v) => patchDeal.mutate({ companyId: v || null })}
            />

            <EditableField
              type="date"
              label="Previsão de fechamento"
              value={deal.forecastDate ?? ""}
              displayValue={formatDate(deal.forecastDate)}
              onSave={(v) => patchDeal.mutate({ forecastDate: v || null })}
            />

            {(deal.stage?.type === "lost" || deal.lossReason) && (
              <EditableField
                type="select"
                label="Motivo da perda"
                value={deal.lossReason ?? ""}
                displayValue={lossLabel ?? "—"}
                options={LOSS_OPTIONS}
                onSave={(v) => patchDeal.mutate({ lossReason: v || null })}
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button
              variant="secondary"
              className="w-full justify-start"
              onClick={async () => {
                const items = await api
                  .get(`/negocios/${deal.id}/itens`)
                  .then((r) => extractData(r));
                setReceivablesModal({
                  dealId: deal.id,
                  companyId: deal.companyId,
                  lineItems: items,
                });
              }}
            >
              <Receipt className="size-4" />
              Gerar recebimentos
            </Button>
            <Button
              variant="danger"
              className="w-full justify-start"
              onClick={() => setArchiveConfirmOpen(true)}
            >
              <Archive className="size-4" />
              Arquivar
            </Button>
          </div>
        </aside>

        {/* ========== CENTRAL COLUMN ========== */}
        <div className="flex min-w-0 flex-col gap-4">
          <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
          {activeTab === "activities" && <ActivityTimeline linkedDealId={id} />}
          {activeTab === "history" && id && (
            <AuditHistory objectType="deal" recordId={id} />
          )}
        </div>

        {/* ========== RIGHT SIDEBAR ========== */}
        <aside className="flex flex-col gap-3 lg:self-start">
          {/* Card: Empresa */}
          <AssociationCard title="Empresa" count={deal.company ? 1 : 0}>
            {deal.company ? (
              <Link
                to={`/empresas/${deal.company.id}`}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-[var(--color-accent-soft)]"
              >
                <Building2 className="size-4 shrink-0 text-[var(--color-muted)]" />
                <span className="truncate text-[var(--color-accent)]">
                  {companyLabel}
                </span>
              </Link>
            ) : (
              <p className="px-2 text-xs text-[var(--color-muted)]">Sem empresa</p>
            )}
          </AssociationCard>

          {/* Card: Contatos */}
          <AssociationCard
            title="Contatos"
            count={(deal.contacts ?? []).length}
            action={{
              label: "Vincular",
              icon: <Plus className="size-3" />,
              onClick: () => setLinkContactOpen(true),
            }}
          >
            {(deal.contacts ?? []).length === 0 ? (
              <p className="px-2 text-xs text-[var(--color-muted)]">Nenhum contato</p>
            ) : (
              <div className="flex flex-col gap-1">
                {(deal.contacts ?? []).map((c) => (
                  <div
                    key={c.id}
                    className="group flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-[var(--color-accent-soft)]"
                  >
                    <Users className="size-3.5 shrink-0 text-[var(--color-muted)]" />
                    <Link
                      to={`/contatos/${c.id}`}
                      className="flex-1 truncate text-[var(--color-accent)] hover:underline"
                    >
                      {c.name}
                    </Link>
                    <button
                      type="button"
                      onClick={() => unlinkContact.mutate(c.id)}
                      className="hidden text-[var(--color-red)] group-hover:block"
                      title="Desvincular"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </AssociationCard>

          {/* Card: Itens de Linha */}
          <AssociationCard
            title="Itens de Linha"
            count={deal.lineItems.length}
            action={{
              label: "Adicionar",
              icon: <Plus className="size-3" />,
              onClick: () => setAddingItem(true),
            }}
            footer={
              deal.lineItems.length > 0 ? (
                <span className="text-xs font-semibold text-[var(--color-text)]">
                  Total: {formatCurrency(deal.totalValue)}
                </span>
              ) : undefined
            }
          >
            {deal.lineItems.length === 0 ? (
              <p className="px-2 text-xs text-[var(--color-muted)]">Nenhum item</p>
            ) : (
              <div className="flex flex-col gap-1">
                {deal.lineItems.map((li) => (
                  <div
                    key={li.id}
                    className="group flex items-center gap-2 rounded-md px-2 py-1 text-sm"
                  >
                    <ShoppingCart className="size-3.5 shrink-0 text-[var(--color-muted)]" />
                    <span className="flex-1 truncate text-[var(--color-text)]">
                      {productMap.get(li.productId) ?? li.productId.slice(0, 8)}
                    </span>
                    <span className="text-xs text-[var(--color-muted)]">
                      {formatCurrency(li.subtotal)}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteLineItem.mutate(li.id)}
                      className="hidden text-[var(--color-red)] group-hover:block"
                      title="Remover"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </AssociationCard>

          {/* Card: Atividades */}
          <AssociationCard title="Atividades" count={(activitiesRaw ?? []).length}>
            {(activitiesRaw ?? []).length === 0 ? (
              <p className="px-2 text-xs text-[var(--color-muted)]">Nenhuma atividade</p>
            ) : (
              <div className="flex flex-col gap-1">
                {(activitiesRaw ?? []).slice(0, 5).map((a: any) => (
                  <div key={a.id} className="flex items-center gap-2 rounded-md px-2 py-1 text-sm">
                    <Activity className="size-3.5 shrink-0 text-[var(--color-muted)]" />
                    <span className="flex-1 truncate text-[var(--color-text)]">
                      {a.title || a.type}
                    </span>
                    <span className="text-[10px] text-[var(--color-muted)]">
                      {formatDate(a.createdAt?.slice(0, 10))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </AssociationCard>

          {/* Card: Projetos */}
          <AssociationCard title="Projetos" count={dealProjects.length}>
            {dealProjects.length === 0 ? (
              <p className="px-2 text-xs text-[var(--color-muted)]">Nenhum projeto</p>
            ) : (
              <div className="flex flex-col gap-1">
                {dealProjects.map((p: any) => (
                  <Link
                    key={p.id}
                    to={`/projetos/${p.id}`}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-[var(--color-accent-soft)]"
                  >
                    <FolderKanban className="size-3.5 shrink-0 text-[var(--color-muted)]" />
                    <span className="flex-1 truncate text-[var(--color-accent)]">
                      {p.title}
                    </span>
                    {p.progress != null && (
                      <ProgressBar value={p.progress} className="w-12" />
                    )}
                  </Link>
                ))}
              </div>
            )}
          </AssociationCard>

          {/* Card: Contas a Receber */}
          <AssociationCard title="Contas a Receber" count={(receivables ?? []).length}>
            {(receivables ?? []).length === 0 ? (
              <p className="px-2 text-xs text-[var(--color-muted)]">Nenhuma conta</p>
            ) : (
              <div className="flex flex-col gap-1">
                {(receivables ?? []).slice(0, 5).map((r: any) => (
                  <Link
                    key={r.id}
                    to={`/contas-receber/${r.id}`}
                    className="flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-[var(--color-accent-soft)]"
                  >
                    <CreditCard className="size-3.5 shrink-0 text-[var(--color-muted)]" />
                    <span className="flex-1 truncate text-[var(--color-text)]">
                      {r.parcelLabel ?? r.description}
                    </span>
                    <Badge variant={STATUS_VARIANT[r.status] ?? "neutral"}>
                      {formatCurrency(r.value)}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </AssociationCard>
        </aside>
      </div>

      {/* ========== MODALS ========== */}
      <Modal
        open={addingItem}
        onOpenChange={setAddingItem}
        title="Adicionar item"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAddingItem(false)}>Cancelar</Button>
            <Button onClick={handleSubmit((data: any) => addLineItem.mutate(data))} loading={addLineItem.isPending}>
              Adicionar
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          <Select
            label="Produto"
            options={productOptions}
            value={watch("productId")}
            onChange={(v) => resetLineForm({ productId: v, quantity: 1, unitPrice: "", discountPercent: "0" })}
          />
          <div className="grid grid-cols-3 gap-3">
            <Input label="Qtd" type="number" min={1} {...register("quantity")} error={lineErrors.quantity?.message} />
            <Input label="Preço unit." type="number" step="0.01" {...register("unitPrice")} error={lineErrors.unitPrice?.message} />
            <Input label="Desc. %" type="number" step="0.01" {...register("discountPercent")} />
          </div>
        </div>
      </Modal>

      <Modal
        open={linkContactOpen}
        onOpenChange={setLinkContactOpen}
        title="Vincular contato"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setLinkContactOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => contactIdToLink && linkContact.mutate(contactIdToLink)}
              loading={linkContact.isPending}
              disabled={!contactIdToLink}
            >
              Vincular
            </Button>
          </div>
        }
      >
        <AsyncCombobox
          label="Contato"
          placeholder="Buscar contato…"
          value={contactIdToLink}
          onChange={setContactIdToLink}
          searchFn={searchContacts}
        />
      </Modal>

      <Modal
        open={archiveConfirmOpen}
        onOpenChange={setArchiveConfirmOpen}
        title="Arquivar negócio"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setArchiveConfirmOpen(false)}>Cancelar</Button>
            <Button variant="danger" onClick={() => archiveMutation.mutate()} loading={archiveMutation.isPending}>Arquivar</Button>
          </div>
        }
      >
        <p className="text-sm text-[var(--color-muted)]">Tem certeza que deseja arquivar este negócio?</p>
      </Modal>

      {receivablesModal && (
        <GenerateReceivablesModal
          open
          onClose={() => setReceivablesModal(null)}
          dealId={receivablesModal.dealId}
          companyId={receivablesModal.companyId}
          lineItems={receivablesModal.lineItems}
        />
      )}
    </div>
  );
}
