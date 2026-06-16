import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { gqlClient } from "../lib/graphql";
import {
  COMPANIES_MINI_DETAIL,
  CONTACT_DETAIL_FULL,
  DEALS_MINI_DETAIL,
  LINK_CONTACT_COMPANY_DETAIL,
  LINK_DEAL_CONTACT_DETAIL,
  UNLINK_CONTACT_COMPANY_DETAIL,
  UNLINK_DEAL_CONTACT_DETAIL,
  UPDATE_CONTACT_DETAIL,
  type CompanyMini,
  type ContactDetailData,
  type ContactEditableField,
  type DealMini,
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

  const { data: companiesData } = useQuery({
    queryKey: ["companies-mini-detail"],
    queryFn: () =>
      gqlClient.request<{ companies: CompanyMini[] }>(COMPANIES_MINI_DETAIL),
  });

  const { data: dealsData } = useQuery({
    queryKey: ["deals-mini-detail"],
    queryFn: () => gqlClient.request<{ deals: DealMini[] }>(DEALS_MINI_DETAIL),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["contact-detail", id] });

  const companyName = (cid: string) => {
    const co = companiesData?.companies.find((c) => c.id === cid);
    return co ? co.trade_name || co.legal_name : "empresa";
  };
  const dealName = (did: string) =>
    dealsData?.deals.find((d) => d.id === did)?.title ?? "negócio";

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
    mutationFn: async (company_id: string) => {
      await gqlClient.request(LINK_CONTACT_COMPANY_DETAIL, {
        contact_id: id,
        company_id,
      });
      await logActivity({
        title: `Empresa vinculada: ${companyName(company_id)}`,
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
        title: `Empresa desvinculada: ${companyName(company_id)}`,
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
    mutationFn: async (deal_id: string) => {
      await gqlClient.request(LINK_DEAL_CONTACT_DETAIL, {
        deal_id,
        contact_id: id,
      });
      await logActivity({
        title: `Negócio vinculado: ${dealName(deal_id)}`,
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
        title: `Negócio desvinculado: ${dealName(deal_id)}`,
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

  const linkedCompanyIds = new Set(
    c.contact_companies?.map((cc) => cc.company.id) ?? []
  );
  const linkedDealIds = new Set(c.deal_contacts?.map((dc) => dc.deal.id) ?? []);
  const availableCompanies = (companiesData?.companies ?? []).filter(
    (co) => !linkedCompanyIds.has(co.id)
  );
  const availableDeals = (dealsData?.deals ?? []).filter(
    (d) => !linkedDealIds.has(d.id)
  );

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
            availableCompanies={availableCompanies}
            availableDeals={availableDeals}
            onLinkCompany={(cid) => linkCompany.mutate(cid)}
            onUnlinkCompany={(cid) => unlinkCompany.mutate(cid)}
            onLinkDeal={(did) => linkDeal.mutate(did)}
            onUnlinkDeal={(did) => unlinkDeal.mutate(did)}
            busy={busyAssoc}
          />
        </div>
      </div>
    </div>
  );
}
