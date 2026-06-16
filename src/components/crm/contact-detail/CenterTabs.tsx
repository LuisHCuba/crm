import { useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase, Building2 } from "lucide-react";
import { formatCurrency, formatDate } from "../../../lib/format";
import { CONTACT_STAGE_LABELS, STAGE_TYPE_STYLES } from "../labels";
import { Badge } from "../ui";
import { ActivityTimeline } from "./ActivityTimeline";
import type { ContactDetailData } from "../../../lib/queries/contact-detail";

type TabKey = "overview" | "activities";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Visão geral" },
  { key: "activities", label: "Atividades" },
];

function OverviewTab({ contact }: { contact: ContactDetailData }) {
  const deals = contact.deal_contacts?.map((dc) => dc.deal) ?? [];
  const companies = contact.contact_companies?.map((cc) => cc.company) ?? [];
  const lastActivity = contact.activities?.[0];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Negócios" value={String(deals.length)} />
        <StatCard label="Empresas" value={String(companies.length)} />
        <StatCard
          label="Atividades"
          value={String(contact.activities?.length ?? 0)}
        />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-800">
          Dados principais
        </h3>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
          <Info label="Ciclo de vida" value={CONTACT_STAGE_LABELS[contact.stage]} />
          <Info label="E-mail" value={contact.email} />
          <Info label="Telefone" value={contact.phone} />
          <Info label="Celular" value={contact.mobile_phone} />
          <Info label="Criado em" value={formatDate(contact.created_at)} />
        </dl>
      </section>

      {lastActivity && (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-800">
            Última atividade
          </h3>
          <p className="text-sm text-slate-600">
            {lastActivity.title ||
              lastActivity.body ||
              lastActivity.email_subject ||
              "—"}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {formatDate(lastActivity.created_at)}
          </p>
        </section>
      )}

      {deals.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">Negócios</h3>
          <div className="space-y-2">
            {deals.map((d) => (
              <Link
                key={d.id}
                to={`/negocios/${d.id}`}
                className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 transition hover:border-indigo-300 hover:bg-indigo-50/40"
              >
                <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Briefcase size={15} className="text-slate-400" />
                  {d.title}
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900">
                    {formatCurrency(d.total_value)}
                  </span>
                  {d.stage && (
                    <Badge className={STAGE_TYPE_STYLES[d.stage.type]}>
                      {d.stage.name}
                    </Badge>
                  )}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {companies.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">Empresas</h3>
          <div className="space-y-2">
            {companies.map((co) => (
              <Link
                key={co.id}
                to={`/empresas/${co.id}`}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50/40"
              >
                <Building2 size={15} className="text-slate-400" />
                {co.trade_name || co.legal_name}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-0.5 text-xs text-slate-500">{label}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-50 py-1 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-800">
        {value || <span className="text-slate-400">—</span>}
      </dd>
    </div>
  );
}

export function CenterTabs({
  contact,
  onActivityCreated,
}: {
  contact: ContactDetailData;
  onActivityCreated: () => void;
}) {
  const [tab, setTab] = useState<TabKey>("activities");

  return (
    <div>
      <div className="mb-5 flex gap-1 border-b border-slate-200">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition ${
                active
                  ? "border-indigo-600 text-indigo-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "overview" && <OverviewTab contact={contact} />}
      {tab === "activities" && (
        <ActivityTimeline
          activities={contact.activities ?? []}
          contactId={contact.id}
          onCreated={onActivityCreated}
        />
      )}
    </div>
  );
}
