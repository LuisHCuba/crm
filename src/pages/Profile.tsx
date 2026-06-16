import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import bcrypt from "bcryptjs";
import {
  User as UserIcon,
  Mail,
  Shield,
  Calendar,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  Save,
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";
import { gqlClient } from "../lib/graphql";
import {
  USER_QUERY,
  UPDATE_USER_PROFILE,
  UPDATE_USER_PASSWORD,
} from "../lib/queries";
import { formatDate } from "../lib/format";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../store/auth";

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar_url: string | null;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  member: "Membro",
};

export default function Profile() {
  const queryClient = useQueryClient();
  const authUser = useAuth((s) => s.user);
  const setUser = useAuth((s) => s.setUser);
  const userId = authUser?.id;

  const { data, isLoading, error } = useQuery({
    queryKey: ["user", userId],
    enabled: !!userId,
    queryFn: () =>
      gqlClient.request<{ users_by_pk: UserRecord }>(USER_QUERY, {
        id: userId,
      }),
  });

  const user = data?.users_by_pk;

  return (
    <div>
      <PageHeader
        title="Meu perfil"
        subtitle="Gerencie seus dados de acesso e segurança"
      />

      <div className="p-8">
        {isLoading && (
          <div className="flex items-center gap-2 text-slate-500">
            <Loader2 className="animate-spin" size={18} /> Carregando...
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            Erro ao carregar o perfil.
          </div>
        )}

        {user && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <IdentityCard user={user} />
            </div>

            <div className="space-y-6 lg:col-span-2">
              <ProfileForm
                user={user}
                onSaved={(updated) => {
                  queryClient.invalidateQueries({ queryKey: ["user", userId] });
                  if (authUser) {
                    setUser({
                      ...authUser,
                      name: updated.name,
                      email: updated.email,
                      avatar_url: updated.avatar_url,
                    });
                  }
                }}
              />
              <PasswordForm user={user} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function IdentityCard({ user }: { user: UserRecord }) {
  const initials = (user.name || user.email || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
      <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-3xl font-bold text-white shadow-lg shadow-indigo-500/30">
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={user.name}
            className="h-full w-full object-cover"
          />
        ) : (
          initials
        )}
      </div>
      <h2 className="text-lg font-bold text-slate-900">{user.name}</h2>
      <p className="text-sm text-slate-500">{user.email}</p>
      <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
        <Shield size={13} />
        {ROLE_LABELS[user.role] || user.role}
      </span>

      <div className="mt-6 space-y-3 border-t border-slate-100 pt-5 text-left text-sm">
        <InfoRow icon={Calendar} label="Membro desde" value={formatDate(user.created_at)} />
        <InfoRow
          icon={Calendar}
          label="Última atualização"
          value={formatDate(user.updated_at)}
        />
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Calendar;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        <Icon size={15} />
      </div>
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="font-medium text-slate-700">{value}</p>
      </div>
    </div>
  );
}

function ProfileForm({
  user,
  onSaved,
}: {
  user: UserRecord;
  onSaved: (u: { name: string; email: string; avatar_url: string | null }) => void;
}) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url ?? "");

  useEffect(() => {
    setName(user.name);
    setEmail(user.email);
    setAvatarUrl(user.avatar_url ?? "");
  }, [user]);

  const mutation = useMutation({
    mutationFn: (set: Record<string, unknown>) =>
      gqlClient.request<{
        update_users_by_pk: {
          name: string;
          email: string;
          avatar_url: string | null;
        };
      }>(UPDATE_USER_PROFILE, { id: user.id, set }),
    onSuccess: (res) => {
      toast.success("Perfil atualizado");
      onSaved(res.update_users_by_pk);
    },
    onError: () => toast.error("Erro ao salvar o perfil"),
  });

  const dirty =
    name.trim() !== user.name ||
    email.trim() !== user.email ||
    (avatarUrl.trim() || null) !== (user.avatar_url ?? null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error("Nome e e-mail são obrigatórios");
      return;
    }
    mutation.mutate({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      avatar_url: avatarUrl.trim() || null,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-6"
    >
      <div className="mb-5 flex items-center gap-2">
        <UserIcon size={18} className="text-indigo-600" />
        <h3 className="text-base font-bold text-slate-900">Dados pessoais</h3>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Nome completo"
          icon={UserIcon}
          value={name}
          onChange={setName}
          required
        />
        <TextField
          label="E-mail"
          icon={Mail}
          type="email"
          value={email}
          onChange={setEmail}
          required
        />
        <div className="sm:col-span-2">
          <TextField
            label="URL do avatar (opcional)"
            icon={UserIcon}
            value={avatarUrl}
            onChange={setAvatarUrl}
            placeholder="https://..."
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          disabled={mutation.isPending || !dirty}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {mutation.isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Save size={16} />
          )}
          Salvar alterações
        </button>
      </div>
    </form>
  );
}

function PasswordForm({ user }: { user: UserRecord }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);

  const mutation = useMutation({
    mutationFn: (hash: string) =>
      gqlClient.request(UPDATE_USER_PASSWORD, { id: user.id, hash }),
    onSuccess: () => {
      toast.success("Senha alterada com sucesso");
      setCurrent("");
      setNext("");
      setConfirm("");
    },
    onError: () => toast.error("Erro ao alterar a senha"),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!bcrypt.compareSync(current, user.password_hash)) {
      toast.error("Senha atual incorreta");
      return;
    }
    if (next.length < 6) {
      toast.error("A nova senha deve ter ao menos 6 caracteres");
      return;
    }
    if (next !== confirm) {
      toast.error("A confirmação não corresponde à nova senha");
      return;
    }
    if (bcrypt.compareSync(next, user.password_hash)) {
      toast.error("A nova senha deve ser diferente da atual");
      return;
    }
    const hash = bcrypt.hashSync(next, 10);
    mutation.mutate(hash);
  };

  const strength = passwordStrength(next);

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-6"
    >
      <div className="mb-5 flex items-center gap-2">
        <KeyRound size={18} className="text-indigo-600" />
        <h3 className="text-base font-bold text-slate-900">Alterar senha</h3>
      </div>

      <div className="space-y-4">
        <PasswordField
          label="Senha atual"
          value={current}
          onChange={setCurrent}
          show={show}
          required
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <PasswordField
              label="Nova senha"
              value={next}
              onChange={setNext}
              show={show}
              required
            />
            {next && (
              <div className="mt-2">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full transition-all ${strength.color}`}
                    style={{ width: `${strength.pct}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">{strength.label}</p>
              </div>
            )}
          </div>
          <PasswordField
            label="Confirmar nova senha"
            value={confirm}
            onChange={setConfirm}
            show={show}
            required
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-600">
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-slate-500 transition hover:bg-slate-100"
          >
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
            {show ? "Ocultar senhas" : "Mostrar senhas"}
          </button>
        </label>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
        >
          {mutation.isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Lock size={16} />
          )}
          Atualizar senha
        </button>
      </div>
    </form>
  );
}

function passwordStrength(pw: string): {
  pct: number;
  label: string;
  color: string;
} {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const levels = [
    { pct: 20, label: "Muito fraca", color: "bg-red-500" },
    { pct: 40, label: "Fraca", color: "bg-orange-500" },
    { pct: 60, label: "Razoável", color: "bg-yellow-500" },
    { pct: 80, label: "Boa", color: "bg-lime-500" },
    { pct: 100, label: "Forte", color: "bg-emerald-500" },
  ];
  return levels[Math.min(score, 5) - 1] ?? levels[0];
}

function TextField({
  label,
  icon: Icon,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  icon: typeof UserIcon;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <div className="relative">
        <Icon
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          placeholder={placeholder}
          className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  show,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <div className="relative">
        <Lock
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          autoComplete="off"
          className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>
    </div>
  );
}
