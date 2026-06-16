import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Building2, Package, Users } from "lucide-react";
import { formatCurrency, formatDate } from "../../../lib/format";
import { LOSS_REASON_LABELS, STAGE_TYPE_STYLES } from "../labels";
import { Avatar, Badge } from "../ui";
import { ActivityTimeline } from "./ActivityTimeline";
import type { DealDetailData } from "../../../lib/queries/deal-detail";

type TabKey = "activities" | "overview" | "about";

const TABS: { key: TabKey; label: string }[] = [
  { key: "activities", label: "Atividades" },
  { key: "overview", label: "Visão geral" },
  { key: "about", label: "Sobre" },
];

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-0.5 text-xs text-slate-500">{label}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-50 py-1.5 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-800">
        {value || <span className="text-slate-400">—</span>}
      </dd>
    </div>
  );
}

function OverviewTab({ deal }: { deal: DealDetailData }) {
  const contacts = deal.deal_contacts?.map((dc) => dc.contact) ?? [];
  const items = deal.line_items ?? [];
  const lastActivity = deal.activities?.[0];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Valor" value={formatCurrency(deal.total_value)} />
        <StatCard label="Contatos" value={String(contacts.length)} />
        <StatCard label="Itens de linha" value={String(items.length)} />
        <StatCard
          label="Atividades"
          value={String(deal.activities?.length ?? 0)}
        />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-800">
          Dados principais
        </h3>
        <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
          <Info label="Pipeline" value={deal.pipeline?.name} />
          <Info
            label="Etapa"
            value={
              deal.stage ? (
                <Badge className={STAGE_TYPE_STYLES[deal.stage.type]}>
                  {deal.stage.name}
                </Badge>
              ) : null
            }
          />
          <Info label="Data de fechamento" value={formatDate(deal.forecast_date)} />
          <Info
            label="Fechado em"
            value={deal.closed_at ? formatDate(deal.closed_at) : null}
          />
          <Info
            label="Proprietário"
            value={
              deal.responsible ? (
                <span className="flex items-center justify-end gap-1.5">
                  <Avatar
                    name={deal.responsible.name}
                    url={deal.responsible.avatar_url}
                    size={18}
                  />
                  {deal.responsible.name}
                </span>
              ) : null
            }
          />
          <Info label="Criado em" value={formatDate(deal.created_at)} />
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

      {items.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">
            Itens de linha
          </h3>
          <div className="space-y-2">
            {items.map((it) => (
              <div
                key={it.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <span className="flex items-center gap-2 font-medium text-slate-700">
                  <Package size={15} className="text-slate-400" />
                  {it.product?.name ?? "Produto"}
                  <span className="text-xs text-slate-400">
                    × {it.quantity}
                  </span>
                </span>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(it.subtotal)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {contacts.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">Contatos</h3>
          <div className="space-y-2">
            {contacts.map((c) => (
              <Link
                key={c.id}
                to={`/contatos/${c.id}`}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50/40"
              >
                <Users size={15} className="text-slate-400" />
                {c.full_name}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function AboutTab({ deal }: { deal: DealDetailData }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-800">
        Dados do negócio
      </h3>
      <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
        <Info label="Nome do negócio" value={deal.title} />
        <Info label="Valor" value={formatCurrency(deal.total_value)} />
        <Info label="Pipeline" value={deal.pipeline?.name} />
        <Info label="Etapa" value={deal.stage?.name} />
        <Info label="Data de fechamento" value={formatDate(deal.forecast_date)} />
        <Info
          label="Empresa"
          value={
            deal.company ? (
              <Link
                to={`/empresas/${deal.company.id}`}
                className="inline-flex items-center gap-1.5 text-indigo-600 hover:underline"
              >
                <Building2 size={14} />
                {deal.company.trade_name || deal.company.legal_name}
              </Link>
            ) : null
          }
        />
        <Info
          label="Motivo da perda"
          value={deal.loss_reason ? LOSS_REASON_LABELS[deal.loss_reason] : null}
        />
        <Info label="Criado em" value={formatDate(deal.created_at)} />
      </dl>
    </section>
  );
}

export function CenterTabs({
  deal,
  onActivityCreated,
}: {
  deal: DealDetailData;
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

      {tab === "activities" && (
        <ActivityTimeline
          activities={deal.activities ?? []}
          dealId={deal.id}
          onCreated={onActivityCreated}
        />
      )}
      {tab === "overview" && <OverviewTab deal={deal} />}
      {tab === "about" && <AboutTab deal={deal} />}
    </div>
  );
}
