import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { gqlClient } from "../lib/graphql";
import {
  CONTACT_DETAIL_FULL,
  LINK_CONTACT_COMPANY_DETAIL,
  LINK_DEAL_CONTACT_DETAIL,
  UNLINK_CONTACT_COMPANY_DETAIL,
  UNLINK_DEAL_CONTACT_DETAIL,
  UPDATE_CONTACT_DETAIL,
  type ContactDetailData,
  type ContactEditableField,
} from "../lib/queries/contact-detail";
import { ARCHIVE_CONTACT, USERS_LIST, type UserRef } from "../lib/queries/crm";
import { logActivity, describeChanges } from "../lib/activity-log";
import { CONTACT_FIELD_LABELS } from "../components/crm/field-labels";
import {
  CONTACT_STAGE_LABELS,
  CONTACT_STAGE_STYLES,
} from "../components/crm/labels";
import { Avatar, Badge, ErrorState, Loading } from "../components/crm/ui";
import { RecordHeader } from "../components/crm/record";
import { AboutCard } from "../components/crm/contact-detail/AboutCard";
import { CenterTabs } from "../components/crm/contact-detail/CenterTabs";
import { Associations } from "../components/crm/contact-detail/Associations";
import { FinanceCard } from "../components/crm/FinanceCard";

export default function ContactDetail() {
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
    queryKey: ["contact-detail", id],
    queryFn: () =>
      gqlClient.request<{ contacts_by_pk: ContactDetailData | null }>(
        CONTACT_DETAIL_FULL,
        { id }
      ),
    enabled: !!id,
  });

  const { data: usersData } = useQuery({
    queryKey: ["users-mini"],
    queryFn: () => gqlClient.request<{ users: UserRef[] }>(USERS_LIST),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["contact-detail", id] });

  // Nome para logs de desvinculação: vem dos vínculos já carregados.
  const linkedCompanyName = (cid: string) => {
    const co = data?.contacts_by_pk?.contact_companies?.find(
      (cc) => cc.company.id === cid
    )?.company;
    return co ? co.trade_name || co.legal_name : "empresa";
  };
  const linkedDealName = (did: string) =>
    data?.contacts_by_pk?.deal_contacts?.find((dc) => dc.deal.id === did)?.deal
      .title ?? "negócio";

  const saveAll = useMutation({
    mutationFn: async (
      changes: Partial<Record<ContactEditableField, string | null>>
    ) => {
      await gqlClient.request(UPDATE_CONTACT_DETAIL, { id, set: changes });
      await logActivity({
        title: "Contato atualizado",
        body: describeChanges(changes, CONTACT_FIELD_LABELS),
        link: { contactId: id },
      });
    },
    onSuccess: () => {
      invalidate();
      toast.success("Contato atualizado");
      setEditing(false);
    },
    onError: () => toast.error("Erro ao salvar contato"),
  });

  const handleSaveAll = (
    changes: Partial<Record<ContactEditableField, string | null>>
  ) => {
    if (Object.keys(changes).length === 0) {
      setEditing(false);
      return;
    }
    saveAll.mutate(changes);
  };

  const linkCompany = useMutation({
    mutationFn: async ({
      company_id,
      label,
    }: {
      company_id: string;
      label?: string;
    }) => {
      await gqlClient.request(LINK_CONTACT_COMPANY_DETAIL, {
        contact_id: id,
        company_id,
      });
      await logActivity({
        title: `Empresa vinculada: ${label ?? "empresa"}`,
        link: { contactId: id, companyId: company_id },
      });
    },
    onSuccess: () => {
      invalidate();
      toast.success("Empresa vinculada");
    },
    onError: () => toast.error("Erro ao vincular empresa"),
  });

  const unlinkCompany = useMutation({
    mutationFn: async (company_id: string) => {
      await gqlClient.request(UNLINK_CONTACT_COMPANY_DETAIL, {
        contact_id: id,
        company_id,
      });
      await logActivity({
        title: `Empresa desvinculada: ${linkedCompanyName(company_id)}`,
        link: { contactId: id, companyId: company_id },
      });
    },
    onSuccess: () => {
      invalidate();
      toast.success("Empresa desvinculada");
    },
    onError: () => toast.error("Erro ao desvincular empresa"),
  });

  const linkDeal = useMutation({
    mutationFn: async ({
      deal_id,
      label,
    }: {
      deal_id: string;
      label?: string;
    }) => {
      await gqlClient.request(LINK_DEAL_CONTACT_DETAIL, {
        deal_id,
        contact_id: id,
      });
      await logActivity({
        title: `Negócio vinculado: ${label ?? "negócio"}`,
        link: { contactId: id, dealId: deal_id },
      });
    },
    onSuccess: () => {
      invalidate();
      toast.success("Negócio vinculado");
    },
    onError: () => toast.error("Erro ao vincular negócio"),
  });

  const unlinkDeal = useMutation({
    mutationFn: async (deal_id: string) => {
      await gqlClient.request(UNLINK_DEAL_CONTACT_DETAIL, {
        deal_id,
        contact_id: id,
      });
      await logActivity({
        title: `Negócio desvinculado: ${linkedDealName(deal_id)}`,
        link: { contactId: id, dealId: deal_id },
      });
    },
    onSuccess: () => {
      invalidate();
      toast.success("Negócio desvinculado");
    },
    onError: () => toast.error("Erro ao desvincular negócio"),
  });

  const archiveContact = useMutation({
    mutationFn: async () => {
      await gqlClient.request(ARCHIVE_CONTACT, { id });
      await logActivity({
        title: "Contato arquivado",
        link: { contactId: id },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts-page"] });
      queryClient.invalidateQueries({ queryKey: ["contacts-view-counts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Contato arquivado");
      navigate("/contatos");
    },
    onError: () => toast.error("Erro ao arquivar contato"),
  });

  if (isLoading)
    return (
      <div className="p-8">
        <Loading />
      </div>
    );
  if (error || !data?.contacts_by_pk)
    return (
      <div className="p-8">
        <ErrorState label="Contato não encontrado." />
      </div>
    );

  const c = data.contacts_by_pk;

  const busyAssoc =
    linkCompany.isPending ||
    unlinkCompany.isPending ||
    linkDeal.isPending ||
    unlinkDeal.isPending;

  return (
    <div className="min-h-full bg-slate-50">
      <RecordHeader
        backTo="/contatos"
        backLabel="Contatos"
        avatar={<Avatar name={c.full_name} size={52} />}
        title={c.full_name}
        badge={
          <Badge className={CONTACT_STAGE_STYLES[c.stage]}>
            {CONTACT_STAGE_LABELS[c.stage]}
          </Badge>
        }
        subtitle={c.job_title || undefined}
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
                    if (confirm(`Arquivar o contato "${c.full_name}"?`))
                      archiveContact.mutate();
                  }}
                  disabled={archiveContact.isPending}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                >
                  <Archive size={15} /> Arquivar contato
                </button>
              </div>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-[320px_1fr_320px] lg:p-8">
        {/* Coluna esquerda: Sobre esse contato (edição inline) */}
        <div className="space-y-6">
          <AboutCard
            contact={c}
            users={usersData?.users ?? []}
            editing={editing}
            saving={saveAll.isPending}
            onEdit={() => setEditing(true)}
            onCancel={() => setEditing(false)}
            onSaveAll={handleSaveAll}
          />
          <FinanceCard contactId={c.id} />
        </div>

        {/* Coluna central: abas */}
        <div className="min-w-0">
          <CenterTabs contact={c} onActivityCreated={invalidate} />
        </div>

        {/* Coluna direita: associações */}
        <div>
          <Associations
            contact={c}
            onLinkCompany={(cid, label) =>
              linkCompany.mutate({ company_id: cid, label })
            }
            onUnlinkCompany={(cid) => unlinkCompany.mutate(cid)}
            onLinkDeal={(did, label) =>
              linkDeal.mutate({ deal_id: did, label })
            }
            onUnlinkDeal={(did) => unlinkDeal.mutate(did)}
            busy={busyAssoc}
          />
        </div>
      </div>
    </div>
  );
}
