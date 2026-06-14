import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, RotateCcw, Archive, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api, extractData, formatMutationError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Drawer } from "@/components/ui/Drawer";
import { Modal } from "@/components/ui/Modal";
import { QueryErrorState } from "@/components/ui/QueryErrorState";

type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  archived: boolean;
  createdAt: string;
};

const createSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

const editSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  email: z.string().email("E-mail inválido"),
  password: z.string().optional(),
});

type CreateInput = z.infer<typeof createSchema>;
type EditInput = z.infer<typeof editSchema>;

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function UserCell({ user }: { user: User }) {
  return (
    <div className="flex items-center gap-3">
      {user.avatarUrl ? (
        <img
          src={user.avatarUrl}
          alt=""
          className="size-9 shrink-0 rounded-[var(--radius-full)] object-cover ring-1 ring-inset ring-[var(--color-border)]"
        />
      ) : (
        <span
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-full)] bg-[var(--color-accent-soft)] text-xs font-semibold text-[var(--color-accent)]"
        >
          {getInitials(user.name)}
        </span>
      )}
      <span className="font-medium text-[var(--color-text)]">{user.name}</span>
    </div>
  );
}

export function UsuariosPage() {
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState<User | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["users-list"],
    queryFn: () => api.get("/auth/users").then((r) => extractData<User>(r)),
  });

  const rows = (data ?? []).filter((u) => showArchived || !u.archived);

  const createMutation = useMutation({
    mutationFn: (d: CreateInput) => api.post("/auth/users", d),
    onSuccess: () => {
      toast.success("Usuário criado");
      qc.invalidateQueries({ queryKey: ["users-list"] });
      qc.invalidateQueries({ queryKey: ["users-options"] });
      setFormOpen(false);
    },
    onError: (e) => toast.error(formatMutationError("Erro ao criar usuário", e)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...d }: EditInput & { id: string }) => api.patch(`/auth/users/${id}`, d),
    onSuccess: () => {
      toast.success("Usuário atualizado");
      qc.invalidateQueries({ queryKey: ["users-list"] });
      qc.invalidateQueries({ queryKey: ["users-options"] });
      setEditingUser(null);
    },
    onError: (e) => toast.error(formatMutationError("Erro ao atualizar usuário", e)),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/auth/users/${id}`),
    onSuccess: () => {
      toast.success("Usuário arquivado");
      qc.invalidateQueries({ queryKey: ["users-list"] });
      setConfirmArchive(null);
    },
    onError: (e) => toast.error(formatMutationError("Erro ao arquivar usuário", e)),
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/auth/users/${id}/restore`),
    onSuccess: () => {
      toast.success("Usuário restaurado");
      qc.invalidateQueries({ queryKey: ["users-list"] });
    },
    onError: (e) => toast.error(formatMutationError("Erro ao restaurar usuário", e)),
  });

  const columns: DataTableColumn<User>[] = [
    { key: "name", header: "Nome", render: (row) => <UserCell user={row} /> },
    {
      key: "email",
      header: "E-mail",
      render: (row) => <span className="text-[var(--color-muted)]">{row.email}</span>,
    },
    {
      key: "createdAt",
      header: "Criado em",
      render: (row) => (
        <span className="whitespace-nowrap text-[var(--color-muted)]">
          {new Date(row.createdAt).toLocaleDateString("pt-BR")}
        </span>
      ),
    },
    {
      key: "__status",
      header: "Status",
      render: (row) =>
        row.archived ? (
          <div className="flex items-center gap-2">
            <Badge variant="neutral">Arquivado</Badge>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => { e.stopPropagation(); restoreMutation.mutate(row.id); }}
            >
              <RotateCcw className="size-3.5" /> Restaurar
            </Button>
          </div>
        ) : (
          <Badge variant="success">Ativo</Badge>
        ),
    },
    {
      key: "__actions",
      header: "",
      render: (row) =>
        !row.archived ? (
          <div className="flex items-center justify-end gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => { e.stopPropagation(); setEditingUser(row); }}
            >
              <Pencil className="size-3.5" /> Editar
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label={`Arquivar ${row.name}`}
              className="size-8 text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)]"
              onClick={(e) => { e.stopPropagation(); setConfirmArchive(row); }}
            >
              <Archive className="size-3.5" />
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl font-semibold text-[var(--color-text)] md:text-2xl">Usuários</h1>
          <p className="text-sm text-[var(--color-muted)]">
            {data
              ? `${rows.length} ${rows.length === 1 ? "usuário" : "usuários"}${showArchived ? "" : " ativo" + (rows.length === 1 ? "" : "s")}`
              : "Gerencie quem acessa o sistema"}
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="size-4" /> Novo usuário
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-xs)]">
        <label className="flex h-10 cursor-pointer items-center gap-2 rounded-[var(--radius-lg)] px-1 text-sm text-[var(--color-muted)]">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="size-4 accent-[var(--color-accent)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]"
          />
          Mostrar arquivados
        </label>
      </div>

      {isError ? (
        <QueryErrorState
          message="Não foi possível carregar os usuários."
          onRetry={() => refetch()}
        />
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          loading={isLoading}
          getRowKey={(row) => row.id}
          emptyMessage={showArchived ? "Nenhum usuário encontrado" : "Nenhum usuário ativo. Crie o primeiro."}
        />
      )}

      <CreateDrawer
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={(d) => createMutation.mutate(d)}
        loading={createMutation.isPending}
      />

      {editingUser && (
        <EditDrawer
          open
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSubmit={(d) => updateMutation.mutate({ id: editingUser.id, ...d })}
          loading={updateMutation.isPending}
        />
      )}

      <Modal open={!!confirmArchive} onOpenChange={() => setConfirmArchive(null)} title="Arquivar usuário">
        <p className="text-sm text-[var(--color-text)]">
          Tem certeza que deseja arquivar <strong>{confirmArchive?.name}</strong>? O usuário não poderá mais acessar o sistema.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmArchive(null)}>Cancelar</Button>
          <Button variant="danger" loading={archiveMutation.isPending} onClick={() => confirmArchive && archiveMutation.mutate(confirmArchive.id)}>
            Arquivar
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function CreateDrawer({ open, onClose, onSubmit, loading }: {
  open: boolean;
  onClose: () => void;
  onSubmit: (d: CreateInput) => void;
  loading: boolean;
}) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateInput>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const submit = (data: CreateInput) => {
    onSubmit(data);
    reset();
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Novo usuário"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button loading={loading} onClick={handleSubmit(submit)}>Criar</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Input label="Nome" {...register("name")} error={errors.name?.message as string} />
        <Input label="E-mail" type="email" {...register("email")} error={errors.email?.message as string} />
        <Input label="Senha" type="password" {...register("password")} error={errors.password?.message as string} />
      </div>
    </Drawer>
  );
}

function EditDrawer({ open, user, onClose, onSubmit, loading }: {
  open: boolean;
  user: User;
  onClose: () => void;
  onSubmit: (d: EditInput) => void;
  loading: boolean;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<EditInput>({
    resolver: zodResolver(editSchema),
    defaultValues: { name: user.name, email: user.email, password: "" },
  });

  const submit = (data: EditInput) => {
    const payload: EditInput = { name: data.name, email: data.email };
    if (data.password && data.password.length > 0) payload.password = data.password;
    onSubmit(payload);
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`Editar — ${user.name}`}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button loading={loading} onClick={handleSubmit(submit)}>Salvar</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Input label="Nome" {...register("name")} error={errors.name?.message as string} />
        <Input label="E-mail" type="email" {...register("email")} error={errors.email?.message as string} />
        <Input label="Nova senha (deixe vazio para manter)" type="password" {...register("password")} error={errors.password?.message as string} />
      </div>
    </Drawer>
  );
}
