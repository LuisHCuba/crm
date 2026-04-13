import { useState } from "react";
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
} from "lucide-react";
import { api, formatMutationError } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { AssociationCard } from "@/components/ui/AssociationCard";
import { EditableField } from "@/components/ui/EditableField";
import { useCompanyOptions, useUserOptions } from "@/lib/use-options";
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

  const companyOptions = useCompanyOptions();
  const userOptions = useUserOptions();

  const { data: contato, isLoading } = useQuery({
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
    return <p className="py-20 text-center text-[var(--color-muted)]">Carregando…</p>;
  }
  if (!contato) {
    return <p className="py-20 text-center text-[var(--color-muted)]">Contato não encontrado.</p>;
  }

  const stageInfo = STAGE_MAP[contato.stage];
  const responsibleName =
    userOptions.find((u) => u.value === contato.responsibleId)?.label ?? "—";
  const availableCompanies = companyOptions.filter(
    (opt) => !(contato.companies ?? []).some((c) => c.id === opt.value),
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/contatos" className="text-[var(--color-muted)] hover:text-[var(--color-text)]">
          <ArrowLeft className="size-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-[var(--color-text)]">{contato.fullName}</h1>
            {stageInfo && <Badge variant={stageInfo.variant}>{stageInfo.label}</Badge>}
          </div>
          <p className="text-sm text-[var(--color-muted)]">{contato.email}</p>
        </div>
      </div>

      {/* 3-column grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[15rem_1fr_17rem]">
        {/* ========== LEFT SIDEBAR ========== */}
        <aside className="flex flex-col gap-4 lg:self-start">
          <div className="flex flex-col gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
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
              type="select"
              label="Responsável"
              value={contato.responsibleId ?? ""}
              displayValue={responsibleName}
              options={userOptions}
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

          {/* Card: Negócios */}
          <AssociationCard title="Negócios" count={(deals ?? []).length}>
            {(deals ?? []).length === 0 ? (
              <p className="px-2 text-xs text-[var(--color-muted)]">Nenhum negócio</p>
            ) : (
              <div className="flex flex-col gap-1">
                {(deals ?? []).slice(0, 5).map((d: any) => (
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
                {(activitiesRaw ?? []).slice(0, 5).map((a: any) => (
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
        {availableCompanies.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">Todas as empresas já estão vinculadas.</p>
        ) : (
          <Select label="Empresa" options={availableCompanies} value={companyIdToLink} onChange={setCompanyIdToLink} placeholder="Selecione…" />
        )}
      </Modal>
    </div>
  );
}
