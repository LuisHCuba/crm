import { useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Archive,
  Users,
  Briefcase,
  Activity,
  FolderKanban,
  CreditCard,
  Wallet,
  Building2,
} from "lucide-react";
import { api, extractData, formatMutationError } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { AssociationCard } from "@/components/ui/AssociationCard";
import { EditableField } from "@/components/ui/EditableField";
import { QueryErrorState } from "@/components/ui/QueryErrorState";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { AuditHistory } from "@/components/AuditHistory";
import { useUserOptions } from "@/lib/use-options";

type Empresa = {
  id: string;
  legalName: string;
  tradeName: string | null;
  document: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  type: "client" | "supplier" | "both";
  responsibleId: string | null;
  createdAt: string;
};

const TYPE_MAP: Record<string, { label: string; variant: "info" | "warning" | "success" }> = {
  client: { label: "Cliente", variant: "info" },
  supplier: { label: "Fornecedor", variant: "warning" },
  both: { label: "Ambos", variant: "success" },
};

const TYPE_OPTIONS = [
  { value: "client", label: "Cliente" },
  { value: "supplier", label: "Fornecedor" },
  { value: "both", label: "Ambos" },
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

export function EmpresaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState("activities");

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

  const { data: empresa, isLoading, isError, refetch } = useQuery({
    queryKey: ["empresa", id],
    queryFn: () => api.get<Empresa>(`/empresas/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const { data: contatos } = useQuery({
    queryKey: ["empresa", id, "contatos"],
    queryFn: () =>
      api.get("/contatos", { params: { companyId: id, perPage: 100 } }).then((r) => {
        const d = r.data;
        return Array.isArray(d) ? d : d?.data ?? [];
      }),
    enabled: !!id,
  });

  const { data: deals } = useQuery({
    queryKey: ["empresa", id, "negocios"],
    queryFn: () =>
      api.get("/negocios", { params: { companyId: id, perPage: 100 } }).then((r) => {
        const d = r.data;
        return Array.isArray(d) ? d : d?.data ?? [];
      }),
    enabled: !!id,
  });

  const { data: activitiesRaw } = useQuery({
    queryKey: ["atividades-preview", "company", id],
    queryFn: () =>
      api.get("/atividades", { params: { linkedCompanyId: id, perPage: 5 } }).then((r) => {
        const d = r.data;
        return Array.isArray(d) ? d : d?.data ?? [];
      }),
    enabled: !!id,
  });

  const dealIds = (deals ?? []).map((d: { id: string }) => d.id);

  const { data: projectsRaw } = useQuery({
    queryKey: ["empresa", id, "projetos", dealIds],
    queryFn: () =>
      api.get("/projetos", { params: { perPage: 100 } }).then((r) => {
        const all = extractData(r);
        return all.filter((p: { dealId?: string | null }) => p.dealId && dealIds.includes(p.dealId));
      }),
    enabled: dealIds.length > 0,
  });

  const { data: receivables } = useQuery({
    queryKey: ["empresa", id, "receber"],
    queryFn: () =>
      api.get("/contas-receber", { params: { companyId: id, perPage: 100 } }).then((r) => {
        const d = r.data;
        return Array.isArray(d) ? d : d?.data ?? [];
      }),
    enabled: !!id,
  });

  const { data: payables } = useQuery({
    queryKey: ["empresa", id, "pagar"],
    queryFn: () =>
      api.get("/contas-pagar", { params: { companyId: id, perPage: 100 } }).then((r) => {
        const d = r.data;
        return Array.isArray(d) ? d : d?.data ?? [];
      }),
    enabled: !!id,
  });

  const patchEmpresa = useMutation({
    mutationFn: (patch: Record<string, unknown>) =>
      api.patch(`/empresas/${id}`, patch).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["empresa", id] });
    },
    onError: (e) => toast.error(formatMutationError("Erro ao salvar", e)),
  });

  const archiveMutation = useMutation({
    mutationFn: () => api.delete(`/empresas/${id}`),
    onSuccess: () => {
      toast.success("Empresa arquivada");
      qc.invalidateQueries({ queryKey: ["empresas"] });
      navigate("/empresas");
    },
    onError: (e) => toast.error(formatMutationError("Erro ao arquivar", e)),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-4 md:p-6" aria-busy="true">
        <div className="flex items-center gap-3">
          <div className="size-9 animate-pulse rounded-[var(--radius-lg)] bg-[var(--color-surface-2)]" />
          <div className="flex flex-col gap-2">
            <div className="h-5 w-56 animate-pulse rounded-[var(--radius-sm)] bg-[var(--color-surface-2)]" />
            <div className="h-3.5 w-32 animate-pulse rounded-[var(--radius-sm)] bg-[var(--color-surface-2)]" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[16rem_1fr_18rem]">
          <div className="h-80 animate-pulse rounded-[var(--radius-xl)] bg-[var(--color-surface-2)]" />
          <div className="h-80 animate-pulse rounded-[var(--radius-xl)] bg-[var(--color-surface-2)]" />
          <div className="hidden h-80 animate-pulse rounded-[var(--radius-xl)] bg-[var(--color-surface-2)] lg:block" />
        </div>
      </div>
    );
  }
  if (isError) {
    return (
      <div className="p-4 md:p-6">
        <QueryErrorState
          message="Não foi possível carregar a empresa."
          onRetry={() => refetch()}
        />
      </div>
    );
  }
  if (!empresa) {
    return (
      <div className="p-4 md:p-6">
        <div className="flex flex-col items-center justify-center gap-4 rounded-[var(--radius-xl)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] px-6 py-16 text-center">
          <span className="flex size-11 items-center justify-center rounded-[var(--radius-full)] bg-[var(--color-surface-2)]" aria-hidden>
            <Building2 className="size-5 text-[var(--color-muted)]" />
          </span>
          <p className="text-sm text-[var(--color-muted)]">Empresa não encontrada.</p>
          <Button variant="secondary" size="sm" onClick={() => navigate("/empresas")}>
            <ArrowLeft className="size-4" />
            Voltar para empresas
          </Button>
        </div>
      </div>
    );
  }

  const typeInfo = TYPE_MAP[empresa.type];
  const responsibleName = empresa.responsibleId
    ? userOptions.find((u) => u.value === empresa.responsibleId)?.label ?? "—"
    : "—";

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link
          to="/empresas"
          aria-label="Voltar para empresas"
          className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-muted)] shadow-[var(--shadow-xs)] outline-none transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
          aria-hidden
        >
          <Building2 className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-semibold text-[var(--color-text)] md:text-2xl">{empresa.legalName}</h1>
            {typeInfo && <Badge variant={typeInfo.variant}>{typeInfo.label}</Badge>}
          </div>
          <p className="mt-0.5 text-sm tabular-nums text-[var(--color-muted)]">{empresa.document}</p>
        </div>
      </div>

      {/* 3-column grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[16rem_1fr_18rem]">
        {/* ========== LEFT SIDEBAR ========== */}
        <aside className="flex flex-col gap-4 lg:self-start">
          <div className="flex flex-col gap-3 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-xs)]">
            <EditableField
              type="text"
              label="Razão social"
              value={empresa.legalName}
              onSave={(v) => patchEmpresa.mutate({ legalName: v })}
            />
            <EditableField
              type="text"
              label="Nome fantasia"
              value={empresa.tradeName}
              onSave={(v) => patchEmpresa.mutate({ tradeName: v || null })}
            />
            <EditableField
              type="text"
              label="CNPJ"
              value={empresa.document}
              onSave={(v) => patchEmpresa.mutate({ document: v })}
            />
            <EditableField
              type="select"
              label="Tipo"
              value={empresa.type}
              displayValue={typeInfo?.label ?? empresa.type}
              options={TYPE_OPTIONS}
              onSave={(v) => patchEmpresa.mutate({ type: v })}
            />
            <EditableField
              type="text"
              label="Telefone"
              value={empresa.phone}
              onSave={(v) => patchEmpresa.mutate({ phone: v || null })}
            />
            <EditableField
              type="email"
              label="E-mail"
              value={empresa.email}
              onSave={(v) => patchEmpresa.mutate({ email: v || null })}
            />
            <EditableField
              type="text"
              label="Endereço"
              value={empresa.address}
              onSave={(v) => patchEmpresa.mutate({ address: v || null })}
            />
            <EditableField
              type="search"
              label="Responsável"
              value={empresa.responsibleId ?? ""}
              displayValue={responsibleName}
              searchFn={searchUsers}
              onSave={(v) => patchEmpresa.mutate({ responsibleId: v || null })}
            />
            <EditableField
              type="readonly"
              label="Criado em"
              value={new Date(empresa.createdAt).toLocaleDateString("pt-BR")}
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
          {activeTab === "activities" && <ActivityTimeline linkedCompanyId={id} />}
          {activeTab === "history" && id && <AuditHistory objectType="company" recordId={id} />}
        </div>

        {/* ========== RIGHT SIDEBAR ========== */}
        <aside className="flex flex-col gap-4 lg:self-start">
          {/* Card: Contatos */}
          <AssociationCard title="Contatos" count={(contatos ?? []).length}>
            {(contatos ?? []).length === 0 ? (
              <p className="px-2 text-xs text-[var(--color-muted)]">Nenhum contato</p>
            ) : (
              <div className="flex flex-col gap-1">
                {(contatos ?? []).slice(0, 5).map((c: { id: string; fullName: string }) => (
                  <Link key={c.id} to={`/contatos/${c.id}`} className="flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-[var(--color-accent-soft)]">
                    <Users className="size-3.5 shrink-0 text-[var(--color-muted)]" />
                    <span className="flex-1 truncate text-[var(--color-accent)]">{c.fullName}</span>
                  </Link>
                ))}
                {(contatos ?? []).length > 5 && (
                  <span className="px-2 text-[10px] text-[var(--color-muted)]">+{(contatos ?? []).length - 5} mais</span>
                )}
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

          {/* Card: Projetos */}
          <AssociationCard title="Projetos" count={(projectsRaw ?? []).length}>
            {(projectsRaw ?? []).length === 0 ? (
              <p className="px-2 text-xs text-[var(--color-muted)]">Nenhum projeto</p>
            ) : (
              <div className="flex flex-col gap-1">
                {(projectsRaw ?? []).slice(0, 5).map((p: { id: string; title: string; progress?: number | null }) => (
                  <Link key={p.id} to={`/projetos/${p.id}`} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-[var(--color-accent-soft)]">
                    <FolderKanban className="size-3.5 shrink-0 text-[var(--color-muted)]" />
                    <span className="flex-1 truncate text-[var(--color-accent)]">{p.title}</span>
                    {p.progress != null && <ProgressBar value={p.progress} className="w-12" />}
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
                {(receivables ?? []).slice(0, 5).map((r: { id: string; parcelLabel?: string | null; description?: string | null; status: string; value: string | number | null }) => (
                  <Link key={r.id} to={`/contas-receber/${r.id}`} className="flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-[var(--color-accent-soft)]">
                    <CreditCard className="size-3.5 shrink-0 text-[var(--color-muted)]" />
                    <span className="flex-1 truncate text-[var(--color-text)]">{r.parcelLabel ?? r.description}</span>
                    <Badge variant={STATUS_VARIANT[r.status] ?? "neutral"}>{formatCurrency(r.value)}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </AssociationCard>

          {/* Card: Contas a Pagar */}
          <AssociationCard title="Contas a Pagar" count={(payables ?? []).length}>
            {(payables ?? []).length === 0 ? (
              <p className="px-2 text-xs text-[var(--color-muted)]">Nenhuma conta</p>
            ) : (
              <div className="flex flex-col gap-1">
                {(payables ?? []).slice(0, 5).map((p: { id: string; parcelLabel?: string | null; description?: string | null; status: string; value: string | number | null }) => (
                  <Link key={p.id} to={`/contas-pagar/${p.id}`} className="flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-[var(--color-accent-soft)]">
                    <Wallet className="size-3.5 shrink-0 text-[var(--color-muted)]" />
                    <span className="flex-1 truncate text-[var(--color-text)]">{p.parcelLabel ?? p.description}</span>
                    <Badge variant={STATUS_VARIANT[p.status] ?? "neutral"}>{formatCurrency(p.value)}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </AssociationCard>
        </aside>
      </div>
    </div>
  );
}
