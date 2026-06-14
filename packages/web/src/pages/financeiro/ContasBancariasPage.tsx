import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Landmark, Plus } from "lucide-react";
import { api, extractData } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { QueryErrorState } from "@/components/ui/QueryErrorState";
import { ContaBancariaForm } from "./ContaBancariaForm";

type BankAccount = {
  id: string;
  name: string;
  bankName: string | null;
  initialBalance: string;
  currentBalance: string;
  active: boolean;
};

export function ContasBancariasPage() {
  const navigate = useNavigate();
  const [formOpen, setFormOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["contas-bancarias"],
    queryFn: () => api.get("/contas-bancarias").then((r) => extractData(r)),
  });

  const rows: BankAccount[] = data ?? [];

  const totalBalance = useMemo(
    () => rows.reduce((sum, r) => sum + Number(r.currentBalance ?? r.initialBalance), 0),
    [rows],
  );

  const columns: DataTableColumn<BankAccount>[] = [
    { key: "name", header: "Nome" },
    {
      key: "bankName",
      header: "Banco",
      render: (row) => row.bankName ?? "—",
    },
    {
      key: "currentBalance",
      header: "Saldo",
      render: (row) => (
        <span className="font-semibold text-[var(--color-accent)]">
          {formatCurrency(row.currentBalance ?? row.initialBalance)}
        </span>
      ),
    },
    {
      key: "active",
      header: "Ativa",
      render: (row) => (
        <Badge variant={row.active ? "success" : "neutral"}>
          {row.active ? "Sim" : "Não"}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="flex size-10 items-center justify-center rounded-[var(--radius-full)] bg-[var(--color-accent-soft)]"
            aria-hidden
          >
            <Landmark className="size-5 text-[var(--color-accent)]" />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-[var(--color-text)]">
              Contas bancárias
            </h1>
            <p className="text-xs text-[var(--color-muted)]">
              Saldos e movimentações das suas contas.
            </p>
          </div>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="size-4" />
          Nova
        </Button>
      </div>

      {isError ? (
        <QueryErrorState
          message="Erro ao carregar contas bancárias."
          onRetry={() => refetch()}
        />
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          loading={isLoading}
          onRowClick={(row) => navigate(`/contas-bancarias/${row.id}`)}
          getRowKey={(row) => row.id}
          emptyMessage="Nenhuma conta bancária cadastrada."
        />
      )}

      <div className="flex items-center justify-end gap-2 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-3 text-sm shadow-[var(--shadow-xs)]">
        <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
          Saldo total
        </span>
        <span className="text-lg font-semibold text-[var(--color-accent)]">
          {formatCurrency(totalBalance)}
        </span>
      </div>

      <ContaBancariaForm open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
}
