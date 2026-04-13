import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { api, formatMutationError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatCurrency, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { AuditHistory } from "@/components/AuditHistory";
import { ContaBancariaForm } from "./ContaBancariaForm";

type Movement = {
  date: string;
  description: string;
  type: "entrada" | "saida";
  value: string;
  runningBalance: string;
};

const TYPE_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "entrada", label: "Entrada" },
  { value: "saida", label: "Saída" },
];

export function ContaBancariaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [tab, setTab] = useState<"extrato" | "historico">("extrato");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const { data: account, isLoading: accountLoading } = useQuery({
    queryKey: ["contas-bancarias", id],
    queryFn: () => api.get(`/contas-bancarias/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const extratoParams: Record<string, string> = { perPage: "50" };
  if (dateFrom) extratoParams.dateFrom = dateFrom;
  if (dateTo) extratoParams.dateTo = dateTo;

  const { data: extratoData, isLoading: extratoLoading } = useQuery({
    queryKey: ["contas-bancarias", id, "extrato", extratoParams],
    queryFn: () =>
      api
        .get(`/contas-bancarias/${id}/extrato`, { params: extratoParams })
        .then((r) => r.data),
    enabled: !!id,
  });

  const movements: Movement[] = (extratoData?.data ?? []).filter(
    (m: Movement) => !typeFilter || m.type === typeFilter,
  );

  const archiveMutation = useMutation({
    mutationFn: () => api.delete(`/contas-bancarias/${id}`).then((r) => r.data),
    onSuccess: () => {
      toast.success("Conta arquivada");
      qc.invalidateQueries({ queryKey: ["contas-bancarias"] });
      navigate("/contas-bancarias");
    },
    onError: (e) => toast.error(formatMutationError("Erro ao arquivar", e)),
  });

  const columns: DataTableColumn<Movement>[] = [
    {
      key: "date",
      header: "Data",
      render: (row) => formatDate(row.date),
    },
    { key: "description", header: "Descrição" },
    {
      key: "type",
      header: "Tipo",
      render: (row) => (
        <Badge variant={row.type === "entrada" ? "success" : "danger"}>
          {row.type === "entrada" ? "Entrada" : "Saída"}
        </Badge>
      ),
    },
    {
      key: "value",
      header: "Valor",
      render: (row) => (
        <span
          className={cn(
            "font-medium",
            row.type === "entrada"
              ? "text-[var(--color-green)]"
              : "text-[var(--color-red)]",
          )}
        >
          {row.type === "entrada" ? "+" : "−"} {formatCurrency(row.value)}
        </span>
      ),
    },
    {
      key: "runningBalance",
      header: "Saldo",
      render: (row) => formatCurrency(row.runningBalance),
    },
  ];

  if (accountLoading) {
    return <p className="py-20 text-center text-[var(--color-muted)]">Carregando…</p>;
  }

  if (!account) {
    return <p className="py-20 text-center text-[var(--color-muted)]">Conta não encontrada.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/contas-bancarias")}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-bold text-[var(--color-text)]">
              {account.name}
            </h1>
            <Badge variant={account.active ? "success" : "neutral"}>
              {account.active ? "Ativa" : "Inativa"}
            </Badge>
          </div>
          <div className="mt-1 flex flex-wrap gap-4 text-sm">
            {account.bankName && (
              <span className="text-[var(--color-muted)]">{account.bankName}</span>
            )}
            {account.branchAccount && (
              <span className="text-[var(--color-muted)]">Ag/Conta: {account.branchAccount}</span>
            )}
            <span className="font-semibold text-[var(--color-accent)]">
              Saldo: {formatCurrency(account.currentBalance ?? account.initialBalance)}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setEditOpen(true)}>
            Editar
          </Button>
          <Button variant="ghost" onClick={() => setArchiveOpen(true)}>
            Arquivar
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-[var(--color-border)]">
        {(["extrato", "historico"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`pb-2 text-sm font-medium transition-colors ${
              tab === t
                ? "border-b-2 border-[var(--color-accent)] text-[var(--color-accent)]"
                : "text-[var(--color-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            {t === "extrato" ? "Extrato" : "Histórico"}
          </button>
        ))}
      </div>

      {tab === "extrato" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <Input
              label="De"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-40"
            />
            <Input
              label="Até"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-40"
            />
            <Select
              options={TYPE_OPTIONS}
              value={typeFilter}
              onChange={setTypeFilter}
              label="Tipo"
              className="w-36"
            />
          </div>

          <DataTable
            columns={columns}
            data={movements}
            loading={extratoLoading}
            getRowKey={(_, i) => String(i)}
          />
        </div>
      )}

      {tab === "historico" && (
        <AuditHistory objectType="bank_account" recordId={id} />
      )}

      <ContaBancariaForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        bankAccount={account}
      />

      <Modal
        open={archiveOpen}
        onOpenChange={(v) => !v && setArchiveOpen(false)}
        title="Arquivar conta bancária"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setArchiveOpen(false)}>
              Voltar
            </Button>
            <Button
              variant="danger"
              onClick={() => archiveMutation.mutate()}
              loading={archiveMutation.isPending}
            >
              Confirmar
            </Button>
          </div>
        }
      >
        <p className="text-sm text-[var(--color-text)]">
          Tem certeza que deseja arquivar esta conta bancária? O registro será removido permanentemente.
        </p>
      </Modal>
    </div>
  );
}
