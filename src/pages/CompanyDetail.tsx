import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Briefcase, MoreHorizontal, Plus, Users, X } from "lucide-react";
import { toast } from "sonner";
import { gqlClient } from "../lib/graphql";
import {
  ARCHIVE_COMPANY,
  COMPANY_DETAIL,
  CONTACTS_MINI,
  LINK_CONTACT_COMPANY,
  UNLINK_CONTACT_COMPANY,
  UPDATE_COMPANY,
  USERS_LIST,
  type Company,
  type ContactRef,
  type UserRef,
} from "../lib/queries/crm";
import { UPDATE_DEAL_DETAIL } from "../lib/queries/deal-detail";
import {
  DEALS_MINI_DETAIL,
  type DealMini,
} from "../lib/queries/contact-detail";
import { logActivity, describeChanges } from "../lib/activity-log";
import { COMPANY_FIELD_LABELS } from "../components/crm/field-labels";
import { formatCurrency } from "../lib/format";
import { Timeline } from "../components/crm/Timeline";
import {
  COMPANY_TYPE_LABELS,
  COMPANY_TYPE_STYLES,
  STAGE_TYPE_STYLES,
} from "../components/crm/labels";
import { Badge, ErrorState, Loading } from "../components/crm/ui";
import { Card, RecordHeader } from "../components/crm/record";
import { AddAssociationPanel } from "../components/crm/associations-ui";
import { ContactForm } from "../components/crm/ContactForm";
import { DealForm } from "../components/crm/DealForm";
import {
  CompanyAboutCard,
  type CompanyEditableField,
} from "../components/crm/company-detail/AboutCard";
import { FinanceCard } from "../components/crm/FinanceCard";

export default function CompanyDetail() {
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
    queryKey: ["company", id],
    queryFn: () =>
      gqlClient.request<{ companies_by_pk: Company | null }>(COMPANY_DETAIL, {
        id,
      }),
    enabled: !!id,
  });

  const { data: usersData } = useQuery({
    queryKey: ["users-mini"],
    queryFn: () => gqlClient.request<{ users: UserRef[] }>(USERS_LIST),
  });

  const { data: contactsData } = useQuery({
    queryKey: ["contacts-mini"],
    queryFn: () => gqlClient.request<{ contacts: ContactRef[] }>(CONTACTS_MINI),
  });

  const { data: dealsData } = useQuery({
    queryKey: ["deals-mini-detail"],
    queryFn: () => gqlClient.request<{ deals: DealMini[] }>(DEALS_MINI_DETAIL),
  });

  const [addingContact, setAddingContact] = useState(false);
  const [addingDeal, setAddingDeal] = useState(false);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["company", id] });

  const contactName = (cid: string) =>
    contactsData?.contacts.find((c) => c.id === cid)?.full_name ?? "contato";
  const dealName = (did: string) =>
    dealsData?.deals.find((d) => d.id === did)?.title ?? "negócio";

  const linkContact = useMutation({
    mutationFn: async (contact_id: string) => {
      await gqlClient.request(LINK_CONTACT_COMPANY, {
        contact_id,
        company_id: id,
      });
      await logActivity({
        title: `Contato vinculado: ${contactName(contact_id)}`,
        link: { companyId: id, contactId: contact_id },
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
      await gqlClient.request(UNLINK_CONTACT_COMPANY, {
        contact_id,
        company_id: id,
      });
      await logActivity({
        title: `Contato desvinculado: ${contactName(contact_id)}`,
        link: { companyId: id, contactId: contact_id },
      });
    },
    onSuccess: () => {
      invalidate();
      toast.success("Contato desvinculado");
    },
    onError: () => toast.error("Erro ao desvincular contato"),
  });

  const linkDeal = useMutation({
    mutationFn: async (deal_id: string) => {
      await gqlClient.request(UPDATE_DEAL_DETAIL, {
        id: deal_id,
        set: { company_id: id },
      });
      await logActivity({
        title: `Negócio vinculado: ${dealName(deal_id)}`,
        link: { companyId: id, dealId: deal_id },
      });
    },
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["deals-board"] });
      toast.success("Negócio vinculado");
    },
    onError: () => toast.error("Erro ao vincular negócio"),
  });

  const unlinkDeal = useMutation({
    mutationFn: async (deal_id: string) => {
      await gqlClient.request(UPDATE_DEAL_DETAIL, {
        id: deal_id,
        set: { company_id: null },
      });
      await logActivity({
        title: `Negócio desvinculado: ${dealName(deal_id)}`,
        link: { companyId: id, dealId: deal_id },
      });
    },
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["deals-board"] });
      toast.success("Negócio desvinculado");
    },
    onError: () => toast.error("Erro ao desvincular negócio"),
  });

  const busyContacts = linkContact.isPending || unlinkContact.isPending;
  const busyDeals = linkDeal.isPending || unlinkDeal.isPending;

  const saveAll = useMutation({
    mutationFn: async (
      changes: Partial<Record<CompanyEditableField, string | null>>
    ) => {
      await gqlClient.request(UPDATE_COMPANY, { id, set: changes });
      await logActivity({
        title: "Empresa atualizada",
        body: describeChanges(changes, COMPANY_FIELD_LABELS),
        link: { companyId: id },
      });
    },
    onSuccess: () => {
      invalidate();
      toast.success("Empresa atualizada");
      setEditing(false);
    },
    onError: () => toast.error("Erro ao salvar empresa"),
  });

  const handleSaveAll = (
    changes: Partial<Record<CompanyEditableField, string | null>>
  ) => {
    if (Object.keys(changes).length === 0) {
      setEditing(false);
      return;
    }
    saveAll.mutate(changes);
  };

  const archiveCompany = useMutation({
    mutationFn: async () => {
      await gqlClient.request(ARCHIVE_COMPANY, { id });
      await logActivity({ title: "Empresa arquivada", link: { companyId: id } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies-list"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Empresa arquivada");
      navigate("/empresas");
    },
    onError: () => toast.error("Erro ao arquivar empresa"),
  });

  if (isLoading)
    return (
      <div className="p-8">
        <Loading />
      </div>
    );
  if (error || !data?.companies_by_pk)
    return (
      <div className="p-8">
        <ErrorState label="Empresa não encontrada." />
      </div>
    );

  const c = data.companies_by_pk;

  const linkedContactIds = new Set(
    c.contact_companies?.map((cc) => cc.contact.id) ?? []
  );
  const linkedDealIds = new Set(c.deals?.map((d) => d.id) ?? []);
  const availableContacts = (contactsData?.contacts ?? []).filter(
    (ct) => !linkedContactIds.has(ct.id)
  );
  const availableDeals = (dealsData?.deals ?? []).filter(
    (d) => !linkedDealIds.has(d.id)
  );

  const addButton = (label: string, onClick: () => void) => (
    <button
      onClick={onClick}
      className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-indigo-600 transition hover:bg-indigo-50"
      title={label}
    >
      <Plus size={14} /> Adicionar
    </button>
  );

  return (
    <div className="min-h-full bg-slate-50">
      <RecordHeader
        backTo="/empresas"
        backLabel="Empresas"
        avatar={
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
            <Users size={22} />
          </div>
        }
        title={c.trade_name || c.legal_name}
        badge={
          <Badge className={COMPANY_TYPE_STYLES[c.type]}>
            {COMPANY_TYPE_LABELS[c.type]}
          </Badge>
        }
        subtitle={c.trade_name ? c.legal_name : c.document}
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
                    if (
                      confirm(
                        `Arquivar a empresa "${c.trade_name || c.legal_name}"?`
                      )
                    )
                      archiveCompany.mutate();
                  }}
                  disabled={archiveCompany.isPending}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                >
                  <Archive size={15} /> Arquivar empresa
                </button>
              </div>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 p-8 lg:grid-cols-[320px_1fr_300px]">
        <div className="space-y-6">
          <CompanyAboutCard
            company={c}
            users={usersData?.users ?? []}
            editing={editing}
            saving={saveAll.isPending}
            onEdit={() => setEditing(true)}
            onCancel={() => setEditing(false)}
            onSaveAll={handleSaveAll}
          />
          <FinanceCard companyId={c.id} />
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Atividades
          </h2>
          <Timeline
            activities={c.activities ?? []}
            linkField="linked_company_id"
            linkId={c.id}
            onCreated={invalidate}
          />
        </div>

        <div className="space-y-6">
          <Card
            title="Contatos"
            action={addButton("Adicionar contato", () =>
              setAddingContact((v) => !v)
            )}
          >
            {addingContact && (
              <AddAssociationPanel
                busy={busyContacts}
                onClose={() => setAddingContact(false)}
                options={availableContacts.map((ct) => ({
                  id: ct.id,
                  label: ct.full_name,
                }))}
                selectPlaceholder="Selecione um contato..."
                onLinkExisting={(cid) => linkContact.mutate(cid)}
                createLabel="Criar contato"
                renderForm={(onClose) => (
                  <ContactForm
                    onClose={onClose}
                    onSaved={(newId) => {
                      if (newId) linkContact.mutate(newId);
                    }}
                  />
                )}
              />
            )}
            <div className="space-y-2">
              {(c.contact_companies ?? []).length === 0 && (
                <p className="text-sm text-slate-400">Nenhum contato.</p>
              )}
              {c.contact_companies?.map((cc) => (
                <div
                  key={cc.contact.id}
                  className="group flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 transition hover:border-indigo-300 hover:bg-indigo-50/40"
                >
                  <Link
                    to={`/contatos/${cc.contact.id}`}
                    className="flex min-w-0 items-center gap-2 text-sm font-medium text-slate-700 hover:text-indigo-600"
                  >
                    <Users size={15} className="shrink-0 text-slate-400" />
                    <span className="truncate">{cc.contact.full_name}</span>
                  </Link>
                  <button
                    onClick={() => unlinkContact.mutate(cc.contact.id)}
                    disabled={busyContacts}
                    className="rounded p-1 text-slate-300 opacity-0 transition hover:text-red-500 group-hover:opacity-100"
                    title="Desvincular"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </Card>

          <Card
            title="Negócios"
            action={addButton("Adicionar negócio", () =>
              setAddingDeal((v) => !v)
            )}
          >
            {addingDeal && (
              <AddAssociationPanel
                busy={busyDeals}
                onClose={() => setAddingDeal(false)}
                options={availableDeals.map((d) => ({
                  id: d.id,
                  label: d.title,
                }))}
                selectPlaceholder="Selecione um negócio..."
                onLinkExisting={(did) => linkDeal.mutate(did)}
                createLabel="Criar negócio"
                renderForm={(onClose) => (
                  <DealForm
                    initialCompanyId={c.id}
                    onClose={onClose}
                    onSaved={() => invalidate()}
                  />
                )}
              />
            )}
            <div className="space-y-2">
              {(c.deals ?? []).length === 0 && (
                <p className="text-sm text-slate-400">Nenhum negócio.</p>
              )}
              {c.deals?.map((d) => (
                <div
                  key={d.id}
                  className="group block rounded-lg border border-slate-200 px-3 py-2 transition hover:border-indigo-300 hover:bg-indigo-50/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      to={`/negocios/${d.id}`}
                      className="flex min-w-0 items-center gap-2 text-sm font-medium text-slate-700 hover:text-indigo-600"
                    >
                      <Briefcase size={15} className="shrink-0 text-slate-400" />
                      <span className="truncate">{d.title}</span>
                    </Link>
                    <button
                      onClick={() => unlinkDeal.mutate(d.id)}
                      disabled={busyDeals}
                      className="rounded p-1 text-slate-300 opacity-0 transition hover:text-red-500 group-hover:opacity-100"
                      title="Desvincular"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="mt-1 flex items-center justify-between pl-[23px]">
                    <span className="text-sm font-semibold text-slate-900">
                      {formatCurrency(d.total_value)}
                    </span>
                    {d.stage && (
                      <Badge className={STAGE_TYPE_STYLES[d.stage.type]}>
                        {d.stage.name}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
