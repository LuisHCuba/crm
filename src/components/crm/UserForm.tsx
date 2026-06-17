import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import bcrypt from "bcryptjs";
import { toast } from "sonner";
import { gqlClient } from "../../lib/graphql";
import { CREATE_USER, UPDATE_USER_ADMIN } from "../../lib/queries";
import { Modal, SelectField, SubmitButton, TextField } from "./ui";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

const ROLE_OPTIONS = [
  { value: "admin", label: "Administrador" },
  { value: "member", label: "Membro" },
];

export function UserForm({
  user,
  onClose,
  onSaved,
}: {
  user?: AdminUser;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = !!user;
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (obj: Record<string, unknown>) => {
      if (editing) {
        await gqlClient.request(UPDATE_USER_ADMIN, { id: user!.id, set: obj });
        return;
      }
      await gqlClient.request(CREATE_USER, { obj });
    },
    onSuccess: () => {
      toast.success(editing ? "Usuário atualizado" : "Usuário criado");
      onSaved();
      onClose();
    },
    onError: (err: unknown) => {
      const msg = String((err as Error)?.message ?? "");
      if (msg.includes("Uniqueness") || msg.includes("unique") || msg.includes("duplicate")) {
        setError("Já existe um usuário com este e-mail.");
      } else {
        toast.error("Erro ao salvar usuário");
      }
    },
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim().toLowerCase();
    const role = String(fd.get("role") ?? "member");
    const avatarUrl = String(fd.get("avatar_url") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    const confirm = String(fd.get("confirm") ?? "");

    if (!name || !email) {
      setError("Nome e e-mail são obrigatórios.");
      return;
    }

    if (!editing && password.length < 6) {
      setError("A senha deve ter ao menos 6 caracteres.");
      return;
    }
    if (password && password.length < 6) {
      setError("A senha deve ter ao menos 6 caracteres.");
      return;
    }
    if (password && password !== confirm) {
      setError("A confirmação não corresponde à senha.");
      return;
    }

    const obj: Record<string, unknown> = {
      name,
      email,
      role,
      avatar_url: avatarUrl || null,
    };
    if (password) {
      obj.password_hash = bcrypt.hashSync(password, 10);
    }

    mutation.mutate(obj);
  };

  return (
    <Modal
      title={editing ? "Editar usuário" : "Novo usuário"}
      onClose={onClose}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          name="name"
          label="Nome completo"
          required
          defaultValue={user?.name}
        />
        <div className="grid grid-cols-2 gap-4">
          <TextField
            name="email"
            label="E-mail"
            type="email"
            required
            defaultValue={user?.email}
          />
          <SelectField
            name="role"
            label="Papel"
            defaultValue={user?.role ?? "member"}
            options={ROLE_OPTIONS}
          />
        </div>
        <TextField
          name="avatar_url"
          label="URL do avatar (opcional)"
          placeholder="https://..."
          defaultValue={user?.avatar_url}
        />

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {editing ? "Redefinir senha (opcional)" : "Senha de acesso"}
          </p>
          <div className="grid grid-cols-2 gap-4">
            <TextField
              name="password"
              label={editing ? "Nova senha" : "Senha"}
              type="password"
              required={!editing}
              placeholder={editing ? "Deixe em branco para manter" : undefined}
            />
            <TextField
              name="confirm"
              label="Confirmar senha"
              type="password"
              required={!editing}
            />
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <SubmitButton loading={mutation.isPending} />
      </form>
    </Modal>
  );
}
