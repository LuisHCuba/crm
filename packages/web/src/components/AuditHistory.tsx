import { useQuery } from "@tanstack/react-query";
import { api, extractData } from "@/lib/api";
import { useReferenceLabels } from "@/lib/use-reference-labels";
import { Badge } from "@/components/ui/Badge";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";

type AuditRow = {
  id: string;
  createdAt: string;
  userId: string | null;
  action: string;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
};

type Props = {
  objectType: string;
  recordId: string;
};

const ACTION_VARIANT: Record<string, "success" | "info" | "danger" | "neutral" | "warning"> = {
  created: "success",
  create: "success",
  updated: "info",
  update: "info",
  archived: "danger",
  delete: "danger",
  restored: "warning",
  stage_changed: "info",
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR");
}

export function AuditHistory({ objectType, recordId }: Props) {
  const { resolveValue, formatField, formatAction, userMap } = useReferenceLabels();

  const { data, isLoading } = useQuery({
    queryKey: ["audit-log", objectType, recordId],
    queryFn: () =>
      api
        .get("/audit-log", { params: { objectType, recordId, perPage: 50 } })
        .then((r) => extractData<AuditRow>(r)),
  });

  const columns: DataTableColumn<AuditRow>[] = [
    {
      key: "createdAt",
      header: "Data/hora",
      render: (r) => (
        <span className="whitespace-nowrap text-[var(--color-muted)]">
          {formatDateTime(r.createdAt)}
        </span>
      ),
    },
    {
      key: "userId",
      header: "Usuário",
      render: (r) =>
        (r.userId && userMap.get(r.userId)) || (
          <span className="text-[var(--color-faint)]">—</span>
        ),
    },
    {
      key: "action",
      header: "Ação",
      render: (r) => (
        <Badge variant={ACTION_VARIANT[r.action] ?? "neutral"}>
          {formatAction(r.action)}
        </Badge>
      ),
    },
    {
      key: "field",
      header: "Campo",
      render: (r) =>
        r.field ? (
          <span className="font-medium text-[var(--color-text)]">{formatField(r.field)}</span>
        ) : (
          <span className="text-[var(--color-faint)]">—</span>
        ),
    },
    {
      key: "oldValue",
      header: "Anterior",
      render: (r) => {
        const label = resolveValue(r.field, r.oldValue);
        if (label === "—") {
          return <span className="text-[var(--color-faint)]">—</span>;
        }
        return (
          <span className="text-[var(--color-muted)]" title={r.oldValue ?? undefined}>
            {label}
          </span>
        );
      },
    },
    {
      key: "newValue",
      header: "Novo",
      render: (r) => {
        const label = resolveValue(r.field, r.newValue);
        if (label === "—") {
          return <span className="text-[var(--color-faint)]">—</span>;
        }
        return (
          <span className="font-medium text-[var(--color-text)]" title={r.newValue ?? undefined}>
            {label}
          </span>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data ?? []}
      loading={isLoading}
      getRowKey={(r) => r.id}
      emptyMessage="Nenhuma alteração registrada."
    />
  );
}
