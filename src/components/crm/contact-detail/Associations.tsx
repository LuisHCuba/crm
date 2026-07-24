import { useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase, Building2, X } from "lucide-react";
import { formatCurrency } from "../../../lib/format";
import { STAGE_TYPE_STYLES } from "../labels";
import { Badge } from "../ui";
import { AddAssociationPanel, CollapsibleCard } from "../associations-ui";
import { CompanyForm } from "../CompanyForm";
import { DealForm } from "../DealForm";
import { searchCompanies, searchDeals } from "../../../lib/entity-search";
import type {
  CompanyMini,
  ContactDetailData,
  DealMini,
} from "../../../lib/queries/contact-detail";

export function Associations({
  contact,
  onLinkCompany,
  onUnlinkCompany,
  onLinkDeal,
  onUnlinkDeal,
  busy,
}: {
  contact: ContactDetailData;
  onLinkCompany: (companyId: string, label?: string) => void;
  onUnlinkCompany: (companyId: string) => void;
  onLinkDeal: (dealId: string, label?: string) => void;
  onUnlinkDeal: (dealId: string) => void;
  busy: boolean;
}) {
  const [addingCompany, setAddingCompany] = useState(false);
  const [addingDeal, setAddingDeal] = useState(false);

  const deals = contact.deal_contacts?.map((dc) => dc.deal) ?? [];
  const companies = contact.contact_companies?.map((cc) => cc.company) ?? [];

  return (
    <div className="space-y-4">
      <CollapsibleCard
        title="Negócios"
        count={deals.length}
        onAdd={() => setAddingDeal((v) => !v)}
      >
        {addingDeal && (
          <AddAssociationPanel
            busy={busy}
            onClose={() => setAddingDeal(false)}
            loadOptions={(q) => searchDeals(q, deals.map((d) => d.id))}
            selectPlaceholder="Buscar negócio..."
            onLinkExisting={onLinkDeal}
            createLabel="Criar negócio"
            renderForm={(onClose) => (
              <DealForm
                onClose={onClose}
                onSaved={(newId) => {
                  if (newId) onLinkDeal(newId);
                }}
              />
            )}
          />
        )}
        <div className="space-y-2">
          {deals.length === 0 && (
            <p className="text-sm text-slate-400">Nenhum negócio.</p>
          )}
          {deals.map((d: DealMini) => (
            <div
              key={d.id}
              className="group rounded-lg border border-slate-200 px-3 py-2 transition hover:border-indigo-300 hover:bg-indigo-50/40"
            >
              <div className="flex items-center justify-between gap-2">
                <Link
                  to={`/negocios/${d.id}`}
                  className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-indigo-600"
                >
                  <Briefcase size={15} className="text-slate-400" />
                  {d.title}
                </Link>
                <button
                  onClick={() => onUnlinkDeal(d.id)}
                  disabled={busy}
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
      </CollapsibleCard>

      <CollapsibleCard
        title="Empresas"
        count={companies.length}
        onAdd={() => setAddingCompany((v) => !v)}
      >
        {addingCompany && (
          <AddAssociationPanel
            busy={busy}
            onClose={() => setAddingCompany(false)}
            loadOptions={(q) =>
              searchCompanies(q, companies.map((co) => co.id))
            }
            selectPlaceholder="Buscar empresa..."
            onLinkExisting={onLinkCompany}
            createLabel="Criar empresa"
            renderForm={(onClose) => (
              <CompanyForm
                onClose={onClose}
                onSaved={(newId) => {
                  if (newId) onLinkCompany(newId);
                }}
              />
            )}
          />
        )}
        <div className="space-y-2">
          {companies.length === 0 && (
            <p className="text-sm text-slate-400">Nenhuma empresa.</p>
          )}
          {companies.map((co: CompanyMini) => (
            <div
              key={co.id}
              className="group flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2"
            >
              <Link
                to={`/empresas/${co.id}`}
                className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-indigo-600"
              >
                <Building2 size={15} className="text-slate-400" />
                {co.trade_name || co.legal_name}
              </Link>
              <button
                onClick={() => onUnlinkCompany(co.id)}
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
    </div>
  );
}
