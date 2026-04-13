import { useState } from "react";
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
} from "lucide-react";
import { api, extractData, formatMutationError } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { AssociationCard } from "@/components/ui/AssociationCard";
import { EditableField } from "@/components/ui/EditableField";
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

  const { data: empresa, isLoading } = useQuery({
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

  const dealIds = (deals ?? []).map((d: any) => d.id);

  const { data: projectsRaw } = useQuery({
    queryKey: ["empresa", id, "projetos", dealIds],
    queryFn: () =>
      api.get("/projetos", { params: { perPage: 100 } }).then((r) => {
        const all = extractData(r);
        return all.filter((p: any) => p.dealId && dealIds.includes(p.dealId));
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
    return <p className="py-20 text-center text-[var(--color-muted)]">Carregando…</p>;
  }
  if (!empresa) {
    return <p className="py-20 text-center text-[var(--color-muted)]">Empresa não encontrada.</p>;
  }

  const typeInfo = TYPE_MAP[empresa.type];
  const responsibleName = empresa.responsibleId
    ? userOptions.find((u) => u.value === empresa.responsibleId)?.label ?? "—"
    : "—";

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/empresas" className="text-[var(--color-muted)] hover:text-[var(--color-text)]">
          <ArrowLeft className="size-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-[var(--color-text)]">{empresa.legalName}</h1>
            {typeInfo && <Badge variant={typeInfo.variant}>{typeInfo.label}</Badge>}
          </div>
          <p className="text-sm text-[var(--color-muted)]">{empresa.document}</p>
        </div>
      </div>

      {/* 3-column grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[15rem_1fr_17rem]">
        {/* ========== LEFT SIDEBAR ========== */}
        <aside className="flex flex-col gap-4 lg:self-start">
          <div className="flex flex-col gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
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
              type="select"
              label="Responsável"
              value={empresa.responsibleId ?? ""}
              displayValue={responsibleName}
              options={userOptions}
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
        <aside className="flex flex-col gap-3 lg:self-start">
          {/* Card: Contatos */}
          <AssociationCard title="Contatos" count={(contatos ?? []).length}>
            {(contatos ?? []).length === 0 ? (
              <p className="px-2 text-xs text-[var(--color-muted)]">Nenhum contato</p>
            ) : (
              <div className="flex flex-col gap-1">
                {(contatos ?? []).slice(0, 5).map((c: any) => (
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

          {/* Card: Projetos */}
          <AssociationCard title="Projetos" count={(projectsRaw ?? []).length}>
            {(projectsRaw ?? []).length === 0 ? (
              <p className="px-2 text-xs text-[var(--color-muted)]">Nenhum projeto</p>
            ) : (
              <div className="flex flex-col gap-1">
                {(projectsRaw ?? []).slice(0, 5).map((p: any) => (
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
                {(receivables ?? []).slice(0, 5).map((r: any) => (
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
                {(payables ?? []).slice(0, 5).map((p: any) => (
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
