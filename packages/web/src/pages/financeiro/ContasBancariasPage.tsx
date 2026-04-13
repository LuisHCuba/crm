import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Landmark, Plus } from "lucide-react";
import { api, extractData } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
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

  const { data, isLoading } = useQuery({
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Landmark className="size-6 text-[var(--color-accent)]" />
          <h1 className="text-xl font-bold text-[var(--color-text)]">
            Contas bancárias
          </h1>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="size-4" />
          Nova
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        loading={isLoading}
        onRowClick={(row) => navigate(`/contas-bancarias/${row.id}`)}
        getRowKey={(row) => row.id}
      />

      <div className="flex justify-end rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm">
        <span className="text-[var(--color-muted)]">Total: </span>
        <span className="ml-2 font-semibold text-[var(--color-accent)]">
          {formatCurrency(totalBalance)}
        </span>
      </div>

      <ContaBancariaForm open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
}
