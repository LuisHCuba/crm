import { useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Archive,
  Plus,
  Building2,
  Briefcase,
  Activity,
  Trash2,
  Loader2,
} from "lucide-react";
import { api, formatMutationError } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { QueryErrorState } from "@/components/ui/QueryErrorState";
import { Tabs } from "@/components/ui/Tabs";
import { AssociationCard } from "@/components/ui/AssociationCard";
import { EditableField } from "@/components/ui/EditableField";
import { AsyncCombobox } from "@/components/ui/AsyncCombobox";
import { useUserOptions } from "@/lib/use-options";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { AuditHistory } from "@/components/AuditHistory";

type Company = {
  id: string;
  legalName: string;
  tradeName: string | null;
  document: string;
  type: string;
};

type Contato = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  jobTitle: string | null;
  origin: string | null;
  stage: "new" | "qualified" | "active_client" | "inactive";
  responsibleId: string | null;
  createdAt: string;
  companies: Company[];
};

const STAGE_MAP: Record<
  string,
  { label: string; variant: "info" | "success" | "warning" | "danger" }
> = {
  new: { label: "Novo", variant: "info" },
  qualified: { label: "Qualificado", variant: "warning" },
  active_client: { label: "Cliente ativo", variant: "success" },
  inactive: { label: "Inativo", variant: "danger" },
};

const STAGE_OPTIONS = [
  { value: "new", label: "Novo" },
  { value: "qualified", label: "Qualificado" },
  { value: "active_client", label: "Cliente ativo" },
  { value: "inactive", label: "Inativo" },
];

const ORIGIN_OPTIONS = [
  { value: "website", label: "Website" },
  { value: "referral", label: "Indicação" },
  { value: "event", label: "Evento" },
  { value: "other", label: "Outro" },
];

const TABS = [
  { id: "activities", label: "Atividades" },
  { id: "history", label: "Histórico" },
];

export function ContatoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState("activities");
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [companyIdToLink, setCompanyIdToLink] = useState("");

  const userOptions = useUserOptions();

  const searchUsers = useCallback(
    async (q: string) => {
      const res = await api.get("/auth/users");
      const all = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      return all
        .filter((u: { id: string; name: string }) => u.name?.toLowerCase().includes(q.toLowerCase()))
        .map((u: { id: string; name: string }) => ({ value: u.id, label: u.name }));
    },
    [],
  );

  const searchCompanies = useCallback(
    async (q: string) => {
      const res = await api.get("/empresas", { params: { search: q, perPage: 20 } });
      const all = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      return all.map((c: { id: string; tradeName?: string | null; legalName: string }) => ({
        value: c.id,
        label: c.tradeName?.trim() || c.legalName,
      }));
    },
    [],
  );

  const { data: contato, isLoading, isError, refetch } = useQuery({
    queryKey: ["contato", id],
    queryFn: () => api.get<Contato>(`/contatos/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const { data: deals } = useQuery({
    queryKey: ["contato", id, "negocios"],
    queryFn: () =>
      api.get("/negocios", { params: { contactId: id, perPage: 100 } }).then((r) => {
        const d = r.data;
        return Array.isArray(d) ? d : d?.data ?? [];
      }),
    enabled: !!id,
  });

  const { data: activitiesRaw } = useQuery({
    queryKey: ["atividades-preview", "contact", id],
    queryFn: () =>
      api.get("/atividades", { params: { linkedContactId: id, perPage: 5 } }).then((r) => {
        const d = r.data;
        return Array.isArray(d) ? d : d?.data ?? [];
      }),
    enabled: !!id,
  });

  const patchContact = useMutation({
    mutationFn: (patch: Record<string, unknown>) =>
      api.patch(`/contatos/${id}`, patch).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contato", id] });
    },
    onError: (e) => toast.error(formatMutationError("Erro ao salvar", e)),
  });

  const archiveMutation = useMutation({
    mutationFn: () => api.delete(`/contatos/${id}`),
    onSuccess: () => {
      toast.success("Contato arquivado");
      qc.invalidateQueries({ queryKey: ["contatos"] });
      navigate("/contatos");
    },
    onError: (e) => toast.error(formatMutationError("Erro ao arquivar", e)),
  });

  const linkMutation = useMutation({
    mutationFn: (companyId: string) =>
      api.post(`/contatos/${id}/empresas`, { companyId }),
    onSuccess: () => {
      toast.success("Empresa vinculada");
      qc.invalidateQueries({ queryKey: ["contato", id] });
      setLinkModalOpen(false);
      setCompanyIdToLink("");
    },
    onError: (e) => toast.error(formatMutationError("Erro ao vincular", e)),
  });

  const unlinkMutation = useMutation({
    mutationFn: (companyId: string) =>
      api.delete(`/contatos/${id}/empresas/${companyId}`),
    onSuccess: () => {
      toast.success("Empresa desvinculada");
      qc.invalidateQueries({ queryKey: ["contato", id] });
    },
    onError: (e) => toast.error(formatMutationError("Erro ao desvincular", e)),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center text-sm text-[var(--color-muted)]">
        <Loader2 className="size-6 animate-spin text-[var(--color-accent)]" aria-hidden />
        Carregando contato…
      </div>
    );
  }
  if (isError) {
    return (
      <div className="py-10">
        <QueryErrorState
          message="Não foi possível carregar o contato."
          onRetry={() => refetch()}
        />
      </div>
    );
  }
  if (!contato) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <p className="text-sm text-[var(--color-muted)]">Contato não encontrado.</p>
        <Button variant="secondary" onClick={() => navigate("/contatos")}>
          <ArrowLeft className="size-4" />
          Voltar para contatos
        </Button>
      </div>
    );
  }

  const stageInfo = STAGE_MAP[contato.stage];
  const responsibleName =
    userOptions.find((u) => u.value === contato.responsibleId)?.label ?? "—";

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/contatos"
          aria-label="Voltar para contatos"
          className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-lg)] text-[var(--color-muted)] outline-none transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-xl font-semibold text-[var(--color-text)]">{contato.fullName}</h1>
            {stageInfo && <Badge variant={stageInfo.variant}>{stageInfo.label}</Badge>}
          </div>
          <p className="truncate text-sm text-[var(--color-muted)]">{contato.email}</p>
        </div>
      </div>

      {/* 3-column grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[15rem_1fr_17rem]">
        {/* ========== LEFT SIDEBAR ========== */}
        <aside className="flex flex-col gap-4 lg:self-start">
          <div className="flex flex-col gap-3 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-xs)]">
            <EditableField
              type="text"
              label="Nome completo"
              value={contato.fullName}
              onSave={(v) => patchContact.mutate({ fullName: v })}
            />
            <EditableField
              type="email"
              label="E-mail"
              value={contato.email}
              onSave={(v) => patchContact.mutate({ email: v })}
            />
            <EditableField
              type="text"
              label="Telefone"
              value={contato.phone}
              onSave={(v) => patchContact.mutate({ phone: v || null })}
            />
            <EditableField
              type="text"
              label="Cargo"
              value={contato.jobTitle}
              onSave={(v) => patchContact.mutate({ jobTitle: v || null })}
            />
            <EditableField
              type="select"
              label="Estágio"
              value={contato.stage}
              displayValue={stageInfo?.label ?? contato.stage}
              options={STAGE_OPTIONS}
              onSave={(v) => patchContact.mutate({ stage: v })}
            />
            <EditableField
              type="select"
              label="Origem"
              value={contato.origin ?? ""}
              displayValue={
                ORIGIN_OPTIONS.find((o) => o.value === contato.origin)?.label ??
                contato.origin ??
                "—"
              }
              options={ORIGIN_OPTIONS}
              onSave={(v) => patchContact.mutate({ origin: v || null })}
            />
            <EditableField
              type="search"
              label="Responsável"
              value={contato.responsibleId ?? ""}
              displayValue={responsibleName}
              searchFn={searchUsers}
              onSave={(v) => patchContact.mutate({ responsibleId: v || null })}
            />
            <EditableField
              type="readonly"
              label="Criado em"
              value={new Date(contato.createdAt).toLocaleDateString("pt-BR")}
            />
          </div>

          <Button
            variant="danger"
            className="w-full justify-start"
            onClick={() => archiveMutation.mutate()}
            loading={archiveMutation.isPending}
          >
            <Archive className="size-4" />
            Arquivar
          </Button>
        </aside>

        {/* ========== CENTRAL COLUMN ========== */}
        <div className="flex min-w-0 flex-col gap-4">
          <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
          {activeTab === "activities" && <ActivityTimeline linkedContactId={id} />}
          {activeTab === "history" && id && <AuditHistory objectType="contact" recordId={id} />}
        </div>

        {/* ========== RIGHT SIDEBAR ========== */}
        <aside className="flex flex-col gap-3 lg:self-start">
          {/* Card: Empresas */}
          <AssociationCard
            title="Empresas"
            count={(contato.companies ?? []).length}
            action={{
              label: "Vincular",
              icon: <Plus className="size-3" />,
              onClick: () => setLinkModalOpen(true),
            }}
          >
            {(contato.companies ?? []).length === 0 ? (
              <p className="px-2 text-xs text-[var(--color-muted)]">Nenhuma empresa</p>
            ) : (
              <div className="flex flex-col gap-1">
                {(contato.companies ?? []).map((c) => (
                  <div key={c.id} className="group flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-[var(--color-accent-soft)]">
                    <Building2 className="size-3.5 shrink-0 text-[var(--color-muted)]" />
                    <Link to={`/empresas/${c.id}`} className="flex-1 truncate text-[var(--color-accent)] hover:underline">
                      {c.tradeName?.trim() || c.legalName}
                    </Link>
                    <button
                      type="button"
                      onClick={() => unlinkMutation.mutate(c.id)}
                      aria-label="Desvincular empresa"
                      title="Desvincular"
                      className="rounded-[var(--radius-sm)] p-1 text-[var(--color-danger)] opacity-0 outline-none transition-opacity hover:bg-[var(--color-danger-soft)] focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] group-hover:opacity-100"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </AssociationCard>

          {/* Card: Negócios */}
          <AssociationCard title="Negócios" count={(deals ?? []).length}>
            {(deals ?? []).length === 0 ? (
              <p className="px-2 text-xs text-[var(--color-muted)]">Nenhum negócio</p>
            ) : (
              <div className="flex flex-col gap-1">
                {(deals ?? []).slice(0, 5).map((d: { id: string; title: string; totalValue?: string | number | null; value?: string | number | null }) => (
                  <Link key={d.id} to={`/negocios/${d.id}`} className="flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-[var(--color-accent-soft)]">
                    <Briefcase className="size-3.5 shrink-0 text-[var(--color-muted)]" />
                    <span className="flex-1 truncate text-[var(--color-accent)]">{d.title}</span>
                    <span className="text-xs text-[var(--color-muted)]">{formatCurrency(d.totalValue ?? d.value)}</span>
                  </Link>
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
                {(activitiesRaw ?? []).slice(0, 5).map((a: { id: string; title?: string | null; type: string; createdAt?: string | null }) => (
                  <div key={a.id} className="flex items-center gap-2 rounded-md px-2 py-1 text-sm">
                    <Activity className="size-3.5 shrink-0 text-[var(--color-muted)]" />
                    <span className="flex-1 truncate text-[var(--color-text)]">{a.title || a.type}</span>
                    <span className="text-[10px] text-[var(--color-muted)]">{formatDate(a.createdAt?.slice(0, 10))}</span>
                  </div>
                ))}
              </div>
            )}
          </AssociationCard>
        </aside>
      </div>

      {/* Modal vincular empresa */}
      <Modal
        open={linkModalOpen}
        onOpenChange={setLinkModalOpen}
        title="Vincular empresa"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setLinkModalOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => companyIdToLink && linkMutation.mutate(companyIdToLink)}
              loading={linkMutation.isPending}
              disabled={!companyIdToLink}
            >
              Vincular
            </Button>
          </div>
        }
      >
        <AsyncCombobox
          label="Empresa"
          placeholder="Buscar empresa…"
          value={companyIdToLink}
          onChange={setCompanyIdToLink}
          searchFn={searchCompanies}
        />
      </Modal>
    </div>
  );
}
