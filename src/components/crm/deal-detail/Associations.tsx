import { useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Users, X } from "lucide-react";
import { AddAssociationPanel, CollapsibleCard } from "../associations-ui";
import { ContactForm } from "../ContactForm";
import { CompanyForm } from "../CompanyForm";
import { LineItemsCard } from "./LineItemsCard";
import type {
  DealCompanyRef,
  DealContactMini,
  DealDetailData,
} from "../../../lib/queries/deal-detail";

export function Associations({
  deal,
  availableContacts,
  companies,
  onLinkContact,
  onUnlinkContact,
  onSetCompany,
  onLineItemsChanged,
  busy,
}: {
  deal: DealDetailData;
  availableContacts: DealContactMini[];
  companies: DealCompanyRef[];
  onLinkContact: (contactId: string) => void;
  onUnlinkContact: (contactId: string) => void;
  onSetCompany: (companyId: string | null) => void;
  onLineItemsChanged: () => void;
  busy: boolean;
}) {
  const [addingContact, setAddingContact] = useState(false);
  const [changingCompany, setChangingCompany] = useState(false);

  const contacts = deal.deal_contacts?.map((dc) => dc.contact) ?? [];
  const companyCount = deal.company ? 1 : 0;

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
            options={availableContacts.map((c) => ({
              id: c.id,
              label: c.full_name,
            }))}
            selectPlaceholder="Selecione um contato..."
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
            options={companies
              .filter((co) => co.id !== deal.company_id)
              .map((co) => ({
                id: co.id,
                label: co.trade_name || co.legal_name,
              }))}
            selectPlaceholder="Selecione uma empresa..."
            onLinkExisting={(id) => onSetCompany(id)}
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

      <LineItemsCard
        dealId={deal.id}
        items={deal.line_items ?? []}
        onChanged={onLineItemsChanged}
      />
    </div>
  );
}
