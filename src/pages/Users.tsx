import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Pencil, Search, Users as UsersIcon, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { gqlClient } from "../lib/graphql";
import { ARCHIVE_USER, USERS_ADMIN_LIST } from "../lib/queries";
import { formatDate } from "../lib/format";
import { PageHeader } from "../components/PageHeader";
import { UserForm, type AdminUser } from "../components/crm/UserForm";
import { Avatar, Badge, EmptyState, ErrorState, Loading } from "../components/crm/ui";
import { useAuth } from "../store/auth";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  member: "Membro",
};

export default function Users() {
  const queryClient = useQueryClient();
  const authUser = useAuth((s) => s.user);
  const isAdmin = authUser?.role === "admin";

  const [formUser, setFormUser] = useState<AdminUser | null | undefined>(
    undefined
  );
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["users-admin"],
    enabled: isAdmin,
    queryFn: () =>
      gqlClient.request<{ users: AdminUser[] }>(USERS_ADMIN_LIST),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => gqlClient.request(ARCHIVE_USER, { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-admin"] });
      toast.success("Usuário removido");
    },
    onError: () => toast.error("Erro ao remover usuário"),
  });

  const filtered = useMemo(() => {
    const list = data?.users ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    );
  }, [data, search]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["users-admin"] });

  const handleArchive = (u: AdminUser) => {
    if (u.id === authUser?.id) {
      toast.error("Você não pode remover o próprio usuário");
      return;
    }
    if (
      window.confirm(
        `Remover o acesso de "${u.name}"? Ele não conseguirá mais entrar no sistema.`
      )
    ) {
      archiveMutation.mutate(u.id);
    }
  };

  if (!isAdmin) {
    return (
      <div>
        <PageHeader
          title="Usuários"
          subtitle="Gerenciamento de acessos"
        />
        <div className="p-8">
          <EmptyState
            icon={<ShieldAlert size={22} />}
            title="Acesso restrito"
            description="Apenas administradores podem gerenciar usuários."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Usuários"
        subtitle={data ? `${data.users.length} usuários` : "Carregando..."}
        action={
          <button
            onClick={() => setFormUser(null)}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            <Plus size={16} /> Novo usuário
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
            placeholder="Buscar por nome ou e-mail..."
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        {isLoading && <Loading />}
        {error && <ErrorState label="Erro ao carregar usuários." />}

        {data && filtered.length === 0 && (
          <EmptyState
            icon={<UsersIcon size={22} />}
            title="Nenhum usuário encontrado"
            description="Cadastre usuários para dar acesso ao sistema."
            action={
              <button
                onClick={() => setFormUser(null)}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                <Plus size={16} /> Novo usuário
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
                  <th className="px-5 py-3">Usuário</th>
                  <th className="px-5 py-3">Papel</th>
                  <th className="px-5 py-3">Criado em</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((u) => (
                  <tr key={u.id} className="group hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} url={u.avatar_url} size={36} />
                        <div>
                          <p className="font-medium text-slate-900">
                            {u.name}
                            {u.id === authUser?.id && (
                              <span className="ml-2 text-xs font-normal text-slate-400">
                                (você)
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-slate-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {u.role === "admin" ? (
                        <Badge className="bg-indigo-50 text-indigo-700">
                          {ROLE_LABELS.admin}
                        </Badge>
                      ) : (
                        <Badge className="bg-slate-100 text-slate-600">
                          {ROLE_LABELS[u.role] || u.role}
                        </Badge>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {formatDate(u.created_at)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 transition group-hover:opacity-100">
                        <button
                          onClick={() => setFormUser(u)}
                          className="rounded-md p-1.5 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                          title="Editar"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleArchive(u)}
                          disabled={
                            archiveMutation.isPending || u.id === authUser?.id
                          }
                          className="rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                          title={
                            u.id === authUser?.id
                              ? "Você não pode remover a si mesmo"
                              : "Remover acesso"
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>

      {formUser !== undefined && (
        <UserForm
          user={formUser ?? undefined}
          onClose={() => setFormUser(undefined)}
          onSaved={invalidate}
        />
      )}
    </div>
  );
}
