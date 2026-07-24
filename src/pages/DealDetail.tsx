import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { gqlClient } from "../lib/graphql";
import {
  ARCHIVE_DEAL_DETAIL,
  COMPANIES_MINI_DEAL_DETAIL,
  DEAL_DETAIL_FULL,
  LINK_DEAL_CONTACT_DETAIL,
  LINK_DEAL_PROPOSAL,
  UNLINK_DEAL_CONTACT_DETAIL,
  UNLINK_DEAL_PROPOSAL,
  UPDATE_DEAL_DETAIL,
  type DealCompanyRef,
  type DealDetailData,
  type DealEditableField,
  type DealFieldValue,
  type DealPipelineRef,
  type DealStageRef,
} from "../lib/queries/deal-detail";
import {
  SET_CONTACTS_ACTIVE_CLIENT,
  USERS_LIST,
  type UserRef,
} from "../lib/queries/crm";
import {
  logActivity,
  describeChanges,
  type ActivityLogInput,
} from "../lib/activity-log";
import { DEAL_FIELD_LABELS } from "../components/crm/field-labels";
import { formatCurrency } from "../lib/format";
import { STAGE_TYPE_STYLES } from "../components/crm/labels";
import { Badge, ErrorState, Loading } from "../components/crm/ui";
import { RecordHeader } from "../components/crm/record";
import { AboutCard } from "../components/crm/deal-detail/AboutCard";
import { CenterTabs } from "../components/crm/deal-detail/CenterTabs";
import { Associations } from "../components/crm/deal-detail/Associations";
import { FinanceCard } from "../components/crm/FinanceCard";

interface DealDetailResponse {
  deals_by_pk: DealDetailData | null;
  pipelines: DealPipelineRef[];
  pipeline_stages: DealStageRef[];
}

export default function DealDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["deal-detail", id],
    queryFn: () => gqlClient.request<DealDetailResponse>(DEAL_DETAIL_FULL, { id }),
    enabled: !!id,
  });

  const { data: usersData } = useQuery({
    queryKey: ["users-mini"],
    queryFn: () => gqlClient.request<{ users: UserRef[] }>(USERS_LIST),
  });

  const { data: companiesData } = useQuery({
    queryKey: ["companies-mini-deal-detail"],
    queryFn: () =>
      gqlClient.request<{ companies: DealCompanyRef[] }>(
        COMPANIES_MINI_DEAL_DETAIL
      ),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["deal-detail", id] });
    queryClient.invalidateQueries({ queryKey: ["deals-board"] });
    queryClient.invalidateQueries({ queryKey: ["proposals"] });
    queryClient.invalidateQueries({ queryKey: ["companies-mini-deal-detail"] });
  };

  const d = data?.deals_by_pk ?? null;
  const stages = data?.pipeline_stages ?? [];
  const pipelines = data?.pipelines ?? [];

  // Nome para logs: vem do próprio registro carregado (vínculos atuais).
  const linkedContactName = (cid: string) =>
    d?.deal_contacts?.find((dc) => dc.contact.id === cid)?.contact.full_name ??
    "contato";
  const companyName = (cid: string) => {
    const co = companiesData?.companies.find((c) => c.id === cid);
    return co ? co.trade_name || co.legal_name : "empresa";
  };

  const saveAll = useMutation({
    mutationFn: async (
      changes: Partial<Record<DealEditableField, DealFieldValue>>
    ) => {
      if (!d) return;
      const set: Record<string, unknown> = { ...changes };
      let newStageId =
        (changes.stage_id as string | undefined) ?? undefined;

      // Troca de pipeline → primeira etapa do novo pipeline.
      if (changes.pipeline_id) {
        const firstStage = stages
          .filter((s) => s.pipeline_id === changes.pipeline_id)
          .sort((a, b) => a.order - b.order)[0];
        if (firstStage) {
          set.stage_id = firstStage.id;
          set.closed_at = null;
          set.loss_reason = null;
          newStageId = firstStage.id;
        }
      }

      // Regras de fechamento conforme o tipo da etapa.
      const stageObj = newStageId
        ? stages.find((s) => s.id === newStageId)
        : null;
      if (stageObj) {
        if (stageObj.type === "won") {
          set.closed_at = d.closed_at ?? new Date().toISOString();
          set.loss_reason = null;
        } else if (stageObj.type === "lost") {
          set.closed_at = d.closed_at ?? new Date().toISOString();
          set.loss_reason = d.loss_reason ?? "other";
        } else {
          set.closed_at = null;
          set.loss_reason = null;
        }
      }

      await gqlClient.request(UPDATE_DEAL_DETAIL, { id, set });

      const logs: ActivityLogInput[] = [];
      logs.push({
        title: "Negócio atualizado",
        body: describeChanges(changes, DEAL_FIELD_LABELS),
        link: { dealId: id, companyId: d.company_id ?? undefined },
      });

      const stageChanged = !!newStageId && newStageId !== d.stage_id;
      if (stageChanged && stageObj) {
        logs.push({
          title: `Negócio movido para "${stageObj.name}"`,
          link: { dealId: id },
        });
        if (stageObj.type === "won") {
          logs.push({
            title: "Negócio marcado como GANHO",
            link: { dealId: id },
          });
        } else if (stageObj.type === "lost") {
          logs.push({
            title: "Negócio marcado como PERDIDO",
            link: { dealId: id },
          });
        }
      }

      // Automação de ciclo de vida: ao ganhar, contatos viram "Cliente ativo".
      if (stageObj?.type === "won") {
        const contactIds = d.deal_contacts?.map((dc) => dc.contact.id) ?? [];
        if (contactIds.length > 0) {
          try {
            const res = await gqlClient.request<{
              update_contacts: { returning: { id: string }[] };
            }>(SET_CONTACTS_ACTIVE_CLIENT, { ids: contactIds });
            for (const c of res.update_contacts.returning) {
              logs.push({
                title: "Contato promovido a Cliente ativo (negócio ganho)",
                link: { contactId: c.id, dealId: id },
              });
            }
          } catch (e) {
            console.error("Falha na automação de ciclo de vida:", e);
          }
        }
      }

      await Promise.all(logs.map((l) => logActivity(l)));
    },
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["contact-detail"] });
      toast.success("Negócio atualizado");
      setEditing(false);
    },
    onError: () => toast.error("Erro ao salvar negócio"),
  });

  const handleSaveAll = (
    changes: Partial<Record<DealEditableField, DealFieldValue>>
  ) => {
    if (Object.keys(changes).length === 0) {
      setEditing(false);
      return;
    }
    saveAll.mutate(changes);
  };

  const setCompany = useMutation({
    mutationFn: async ({
      companyId,
      label,
    }: {
      companyId: string | null;
      label?: string;
    }) => {
      await gqlClient.request(UPDATE_DEAL_DETAIL, {
        id,
        set: { company_id: companyId },
      });
      await logActivity({
        title: companyId
          ? `Empresa vinculada: ${label ?? companyName(companyId)}`
          : "Empresa removida do negócio",
        link: { dealId: id, companyId: companyId ?? undefined },
      });
    },
    onSuccess: () => {
      invalidate();
      toast.success("Empresa atualizada");
    },
    onError: () => toast.error("Erro ao atualizar empresa"),
  });

  const linkContact = useMutation({
    mutationFn: async ({
      contact_id,
      label,
    }: {
      contact_id: string;
      label?: string;
    }) => {
      await gqlClient.request(LINK_DEAL_CONTACT_DETAIL, {
        deal_id: id,
        contact_id,
      });
      await logActivity({
        title: `Contato vinculado: ${label ?? "contato"}`,
        link: { dealId: id, contactId: contact_id },
      });
    },
    onSuccess: () => {
      invalidate();
      toast.success("Contato vinculado");
    },
    onError: () => toast.error("Erro ao vincular contato"),
  });

  const unlinkContact = useMutation({
    mutationFn: async (contact_id: string) => {
      const name = linkedContactName(contact_id);
      await gqlClient.request(UNLINK_DEAL_CONTACT_DETAIL, {
        deal_id: id,
        contact_id,
      });
      await logActivity({
        title: `Contato desvinculado: ${name}`,
        link: { dealId: id, contactId: contact_id },
      });
    },
    onSuccess: () => {
      invalidate();
      toast.success("Contato desvinculado");
    },
    onError: () => toast.error("Erro ao desvincular contato"),
  });

  const linkedProposalTitle = (pid: string) =>
    d?.proposals?.find((p) => p.id === pid)?.title ?? "proposta";

  const linkProposal = useMutation({
    mutationFn: async ({
      proposal_id,
      label,
    }: {
      proposal_id: string;
      label?: string;
    }) => {
      await gqlClient.request(LINK_DEAL_PROPOSAL, {
        proposal_id,
        deal_id: id,
      });
      await logActivity({
        title: `Proposta vinculada: ${label ?? "proposta"}`,
        link: { dealId: id },
      });
    },
    onSuccess: () => {
      invalidate();
      toast.success("Proposta vinculada");
    },
    onError: () => toast.error("Erro ao vincular proposta"),
  });

  const unlinkProposal = useMutation({
    mutationFn: async (proposal_id: string) => {
      const title = linkedProposalTitle(proposal_id);
      await gqlClient.request(UNLINK_DEAL_PROPOSAL, { proposal_id });
      await logActivity({
        title: `Proposta desvinculada: ${title}`,
        link: { dealId: id },
      });
    },
    onSuccess: () => {
      invalidate();
      toast.success("Proposta desvinculada");
    },
    onError: () => toast.error("Erro ao desvincular proposta"),
  });

  const archiveDeal = useMutation({
    mutationFn: async () => {
      await gqlClient.request(ARCHIVE_DEAL_DETAIL, { id });
      await logActivity({ title: "Negócio arquivado", link: { dealId: id } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals-board"] });
      queryClient.invalidateQueries({ queryKey: ["deals-page"] });
      queryClient.invalidateQueries({ queryKey: ["deals-total"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Negócio arquivado");
      navigate("/negocios");
    },
    onError: () => toast.error("Erro ao arquivar negócio"),
  });

  if (isLoading)
    return (
      <div className="p-8">
        <Loading />
      </div>
    );
  if (error || !d)
    return (
      <div className="p-8">
        <ErrorState label="Negócio não encontrado." />
      </div>
    );

  const busyAssoc =
    linkContact.isPending ||
    unlinkContact.isPending ||
    setCompany.isPending ||
    linkProposal.isPending ||
    unlinkProposal.isPending;

  const confirmArchive = () => {
    if (confirm(`Arquivar o negócio "${d.title}"?`)) archiveDeal.mutate();
  };

  return (
    <div className="min-h-full bg-slate-50">
      <RecordHeader
        backTo="/negocios"
        backLabel="Negócios"
        title={d.title}
        badge={
          d.stage ? (
            <Badge className={STAGE_TYPE_STYLES[d.stage.type]}>
              {d.stage.name}
            </Badge>
          ) : undefined
        }
        subtitle={
          <span className="text-base font-bold text-indigo-700">
            {formatCurrency(d.total_value)}
          </span>
        }
        actions={
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              title="Mais ações"
            >
              <MoreHorizontal size={16} /> Mais
            </button>
            {menuOpen && (
              <div className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    confirmArchive();
                  }}
                  disabled={archiveDeal.isPending}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                >
                  <Archive size={15} /> Arquivar negócio
                </button>
              </div>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-[320px_1fr_340px] lg:p-8">
        {/* Coluna esquerda: Sobre esse negócio (edição inline) */}
        <div className="space-y-6">
          <AboutCard
            deal={d}
            users={usersData?.users ?? []}
            pipelines={pipelines}
            stages={stages}
            companies={companiesData?.companies ?? []}
            editing={editing}
            saving={saveAll.isPending}
            onEdit={() => setEditing(true)}
            onCancel={() => setEditing(false)}
            onSaveAll={handleSaveAll}
          />
          <FinanceCard dealId={d.id} />
        </div>

        {/* Coluna central: abas */}
        <div className="min-w-0">
          <CenterTabs deal={d} onActivityCreated={invalidate} />
        </div>

        {/* Coluna direita: associações + itens de linha */}
        <div>
          <Associations
            deal={d}
            onLinkContact={(cid, label) =>
              linkContact.mutate({ contact_id: cid, label })
            }
            onUnlinkContact={(cid) => unlinkContact.mutate(cid)}
            onSetCompany={(companyId, label) =>
              setCompany.mutate({ companyId, label })
            }
            onLinkProposal={(pid, label) =>
              linkProposal.mutate({ proposal_id: pid, label })
            }
            onUnlinkProposal={(pid) => unlinkProposal.mutate(pid)}
            onLineItemsChanged={invalidate}
            busy={busyAssoc}
          />
        </div>
      </div>
    </div>
  );
}
