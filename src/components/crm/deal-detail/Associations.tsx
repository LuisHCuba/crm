import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  ExternalLink,
  FileText,
  Link as LinkIcon,
  Lock,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AddAssociationPanel, CollapsibleCard } from "../associations-ui";
import { ContactForm } from "../ContactForm";
import { CompanyForm } from "../CompanyForm";
import { ProposalForm } from "../ProposalForm";
import { LineItemsCard } from "./LineItemsCard";
import {
  searchCompanies,
  searchContacts,
  searchProposalsUnlinked,
} from "../../../lib/entity-search";
import type { DealDetailData } from "../../../lib/queries/deal-detail";

export function Associations({
  deal,
  onLinkContact,
  onUnlinkContact,
  onSetCompany,
  onLinkProposal,
  onUnlinkProposal,
  onLineItemsChanged,
  busy,
}: {
  deal: DealDetailData;
  onLinkContact: (contactId: string, label?: string) => void;
  onUnlinkContact: (contactId: string) => void;
  onSetCompany: (companyId: string | null, label?: string) => void;
  onLinkProposal: (proposalId: string, label?: string) => void;
  onUnlinkProposal: (proposalId: string) => void;
  onLineItemsChanged: () => void;
  busy: boolean;
}) {
  const [addingContact, setAddingContact] = useState(false);
  const [changingCompany, setChangingCompany] = useState(false);
  const [addingProposal, setAddingProposal] = useState(false);

  const contacts = deal.deal_contacts?.map((dc) => dc.contact) ?? [];
  const companyCount = deal.company ? 1 : 0;
  const proposals = deal.proposals ?? [];

  const copyProposalLink = async (proposalId: string) => {
    const url = `${window.location.origin}/p/${proposalId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link público copiado");
    } catch {
      toast.error("Não foi possível copiar. Link: " + url);
    }
  };

  return (
    <div className="space-y-4">
      <CollapsibleCard
        title="Contatos"
        count={contacts.length}
        onAdd={() => setAddingContact((v) => !v)}
      >
        {addingContact && (
          <AddAssociationPanel
            busy={busy}
            onClose={() => setAddingContact(false)}
            loadOptions={(q) =>
              searchContacts(q, contacts.map((c) => c.id))
            }
            selectPlaceholder="Buscar contato..."
            onLinkExisting={onLinkContact}
            createLabel="Criar contato"
            renderForm={(onClose) => (
              <ContactForm
                onClose={onClose}
                onSaved={(newId) => {
                  if (newId) onLinkContact(newId);
                }}
              />
            )}
          />
        )}
        <div className="space-y-2">
          {contacts.length === 0 && (
            <p className="text-sm text-slate-400">Nenhum contato.</p>
          )}
          {contacts.map((c) => (
            <div
              key={c.id}
              className="group flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2"
            >
              <Link
                to={`/contatos/${c.id}`}
                className="flex min-w-0 items-center gap-2 text-sm font-medium text-slate-700 hover:text-indigo-600"
              >
                <Users size={15} className="shrink-0 text-slate-400" />
                <span className="truncate">{c.full_name}</span>
              </Link>
              <button
                onClick={() => onUnlinkContact(c.id)}
                disabled={busy}
                className="rounded p-1 text-slate-300 opacity-0 transition hover:text-red-500 group-hover:opacity-100"
                title="Desvincular"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      </CollapsibleCard>

      <CollapsibleCard
        title="Empresas"
        count={companyCount}
        onAdd={() => setChangingCompany((v) => !v)}
      >
        {changingCompany && (
          <AddAssociationPanel
            busy={busy}
            onClose={() => setChangingCompany(false)}
            loadOptions={(q) =>
              searchCompanies(q, deal.company_id ? [deal.company_id] : [])
            }
            selectPlaceholder="Buscar empresa..."
            onLinkExisting={(id, label) => onSetCompany(id, label)}
            createLabel="Criar empresa"
            renderForm={(onClose) => (
              <CompanyForm
                onClose={onClose}
                onSaved={(newId) => {
                  if (newId) onSetCompany(newId);
                }}
              />
            )}
          />
        )}
        {deal.company ? (
          <div className="group flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2">
            <Link
              to={`/empresas/${deal.company.id}`}
              className="flex min-w-0 items-center gap-2 text-sm font-medium text-slate-700 hover:text-indigo-600"
            >
              <Building2 size={15} className="shrink-0 text-slate-400" />
              <span className="truncate">
                {deal.company.trade_name || deal.company.legal_name}
              </span>
            </Link>
            <button
              onClick={() => onSetCompany(null)}
              disabled={busy}
              className="rounded p-1 text-slate-300 opacity-0 transition hover:text-red-500 group-hover:opacity-100"
              title="Remover empresa"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <p className="text-sm text-slate-400">Nenhuma empresa.</p>
        )}
      </CollapsibleCard>

      <CollapsibleCard
        title="Propostas"
        count={proposals.length}
        onAdd={() => setAddingProposal((v) => !v)}
      >
        {addingProposal && (
          <AddAssociationPanel
            busy={busy}
            onClose={() => setAddingProposal(false)}
            loadOptions={searchProposalsUnlinked}
            selectPlaceholder="Buscar proposta..."
            onLinkExisting={onLinkProposal}
            createLabel="Criar proposta"
            renderForm={(onClose) => (
              <ProposalForm
                defaultDealId={deal.id}
                onClose={onClose}
                onSaved={(newId) => {
                  if (newId) onLinkProposal(newId);
                }}
              />
            )}
          />
        )}
        <div className="space-y-2">
          {proposals.length === 0 && (
            <p className="text-sm text-slate-400">Nenhuma proposta.</p>
          )}
          {proposals.map((p) => (
            <div
              key={p.id}
              className="group flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-slate-700">
                <FileText size={15} className="shrink-0 text-slate-400" />
                <span className="truncate" title={p.title}>
                  {p.title}
                </span>
                {p.password && (
                  <Lock
                    size={12}
                    className="shrink-0 text-amber-500"
                    aria-label="Protegida por senha"
                  />
                )}
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  onClick={() => copyProposalLink(p.id)}
                  className="rounded p-1 text-slate-300 transition hover:text-indigo-600 group-hover:text-slate-400 group-hover:hover:text-indigo-600"
                  title="Copiar link público"
                >
                  <LinkIcon size={14} />
                </button>
                <a
                  href={`/p/${p.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded p-1 text-slate-300 transition hover:text-indigo-600 group-hover:text-slate-400 group-hover:hover:text-indigo-600"
                  title="Abrir link público"
                >
                  <ExternalLink size={14} />
                </a>
                <button
                  onClick={() => onUnlinkProposal(p.id)}
                  disabled={busy}
                  className="rounded p-1 text-slate-300 opacity-0 transition hover:text-red-500 group-hover:opacity-100"
                  title="Desvincular"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </CollapsibleCard>

      <LineItemsCard
        dealId={deal.id}
        dealTotal={Number(deal.total_value ?? 0)}
        items={deal.line_items ?? []}
        onChanged={onLineItemsChanged}
      />
    </div>
  );
}
