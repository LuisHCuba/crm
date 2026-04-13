import { useQuery } from "@tanstack/react-query";
import { api, extractData } from "@/lib/api";
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

type UserRow = { id: string; name: string };

type Props = {
  objectType: string;
  recordId: string;
};

const ACTION_LABEL: Record<string, string> = {
  create: "Criação",
  update: "Atualização",
  delete: "Exclusão",
};

const ACTION_VARIANT: Record<string, "success" | "info" | "danger" | "neutral"> = {
  create: "success",
  update: "info",
  delete: "danger",
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR");
}

export function AuditHistory({ objectType, recordId }: Props) {
  const { data: users } = useQuery({
    queryKey: ["audit-users"],
    queryFn: async () => {
      const res = await api.get("/auth/users");
      const list: UserRow[] = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      return new Map(list.map((u) => [u.id, u.name]));
    },
    staleTime: 60_000,
  });

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
      render: (r) => formatDateTime(r.createdAt),
    },
    {
      key: "userId",
      header: "Usuário",
      render: (r) => (r.userId && users?.get(r.userId)) || "—",
    },
    {
      key: "action",
      header: "Ação",
      render: (r) => (
        <Badge variant={ACTION_VARIANT[r.action] ?? "neutral"}>
          {ACTION_LABEL[r.action] ?? r.action}
        </Badge>
      ),
    },
    { key: "field", header: "Campo" },
    { key: "oldValue", header: "Anterior" },
    { key: "newValue", header: "Novo" },
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
