import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Mail, Phone, Search, Building2 } from "lucide-react";
import { toast } from "sonner";
import { gqlClient } from "../lib/graphql";
import {
  ARCHIVE_COMPANY,
  COMPANIES_LIST,
  type Company,
} from "../lib/queries/crm";
import { PageHeader } from "../components/PageHeader";
import { CompanyForm } from "../components/crm/CompanyForm";
import { COMPANY_TYPE_LABELS, COMPANY_TYPE_STYLES } from "../components/crm/labels";
import { Badge, EmptyState, ErrorState, Loading } from "../components/crm/ui";

type CompanyRow = Company & {
  contact_companies_aggregate?: { aggregate: { count: number } };
  deals_aggregate?: { aggregate: { count: number } };
};

export default function Companies() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["companies"],
    queryFn: () =>
      gqlClient.request<{ companies: CompanyRow[] }>(COMPANIES_LIST),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => gqlClient.request(ARCHIVE_COMPANY, { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Empresa arquivada");
    },
    onError: () => toast.error("Erro ao arquivar empresa"),
  });

  const filtered = useMemo(() => {
    const list = data?.companies ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (c) =>
        c.legal_name.toLowerCase().includes(q) ||
        (c.trade_name ?? "").toLowerCase().includes(q) ||
        c.document.toLowerCase().includes(q)
    );
  }, [data, search]);

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Empresas"
        subtitle={data ? `${data.companies.length} empresas` : "Carregando..."}
        action={
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            <Plus size={16} /> Nova empresa
          </button>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col gap-4 p-8">
        <div className="relative max-w-md">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por razão social, nome fantasia ou CNPJ..."
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        {isLoading && <Loading />}
        {error && <ErrorState label="Erro ao carregar empresas." />}

        {data && filtered.length === 0 && (
          <EmptyState
            icon={<Building2 size={22} />}
            title="Nenhuma empresa encontrada"
            description="Cadastre uma empresa para vincular contatos e negócios."
            action={
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                <Plus size={16} /> Nova empresa
              </button>
            }
          />
        )}

        {data && filtered.length > 0 && (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Empresa</th>
                  <th className="px-5 py-3">CNPJ</th>
                  <th className="px-5 py-3">Tipo</th>
                  <th className="px-5 py-3">Contato</th>
                  <th className="px-5 py-3 text-center">Contatos</th>
                  <th className="px-5 py-3 text-center">Negócios</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c) => (
                  <tr key={c.id} className="group hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <Link to={`/empresas/${c.id}`} className="block">
                        <p className="font-medium text-slate-900 group-hover:text-indigo-700">
                          {c.trade_name || c.legal_name}
                        </p>
                        {c.trade_name && (
                          <p className="text-xs text-slate-500">
                            {c.legal_name}
                          </p>
                        )}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{c.document}</td>
                    <td className="px-5 py-3">
                      <Badge className={COMPANY_TYPE_STYLES[c.type]}>
                        {COMPANY_TYPE_LABELS[c.type]}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      <div className="space-y-0.5">
                        {c.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail size={13} className="text-slate-400" />
                            {c.email}
                          </div>
                        )}
                        {c.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone size={13} className="text-slate-400" />
                            {c.phone}
                          </div>
                        )}
                        {!c.email && !c.phone && "—"}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center text-slate-600">
                      {c.contact_companies_aggregate?.aggregate.count ?? 0}
                    </td>
                    <td className="px-5 py-3 text-center text-slate-600">
                      {c.deals_aggregate?.aggregate.count ?? 0}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => archiveMutation.mutate(c.id)}
                        disabled={archiveMutation.isPending}
                        className="rounded-md p-1.5 text-slate-400 opacity-0 transition group-hover:opacity-100 hover:bg-red-50 hover:text-red-600"
                        title="Arquivar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <CompanyForm
          onClose={() => setShowForm(false)}
          onSaved={() =>
            queryClient.invalidateQueries({ queryKey: ["companies"] })
          }
        />
      )}
    </div>
  );
}
