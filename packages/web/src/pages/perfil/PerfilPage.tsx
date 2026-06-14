import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Lock, PanelLeftClose, Settings2, UserRound } from "lucide-react";
import { api, formatMutationError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useAuthStore } from "@/stores/auth-store";
import { useUiStore } from "@/stores/ui-store";

const THEME_KEY = "meucrm-theme";

const profileSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  avatarUrl: z.string().url("URL inválida").or(z.literal("")).optional(),
  themePreference: z.enum(["light", "dark", "system"]),
  sidebarCollapsed: z.boolean(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Senha atual obrigatória"),
  newPassword: z.string().min(6, "Nova senha deve ter pelo menos 6 caracteres"),
});

type ProfileValues = z.infer<typeof profileSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

const THEME_OPTIONS = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Escuro" },
  { value: "system", label: "Sistema" },
];

export function PerfilPage() {
  const queryClient = useQueryClient();
  const login = useAuthStore((s) => s.login);
  const token = useAuthStore((s) => s.token);
  const setSidebarCollapsed = useUiStore((s) => s.setSidebarCollapsed);

  const { data: me, isLoading } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => api.get("/auth/me").then((r) => r.data),
  });

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    values: me
      ? {
          name: me.name ?? "",
          avatarUrl: me.avatarUrl ?? "",
          themePreference: me.themePreference ?? "system",
          sidebarCollapsed: me.sidebarCollapsed ?? false,
        }
      : undefined,
  });

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "" },
  });

  const updateProfile = useMutation({
    mutationFn: (data: ProfileValues) =>
      api.patch("/auth/profile", {
        name: data.name,
        avatarUrl: data.avatarUrl || null,
        themePreference: data.themePreference,
        sidebarCollapsed: data.sidebarCollapsed,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      if (token) login(res.data, token);
      setSidebarCollapsed(res.data.sidebarCollapsed ?? false);

      const theme = res.data.themePreference;
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
        localStorage.setItem(THEME_KEY, "dark");
      } else if (theme === "light") {
        document.documentElement.classList.remove("dark");
        localStorage.setItem(THEME_KEY, "light");
      } else {
        const prefersDark = window.matchMedia(
          "(prefers-color-scheme: dark)",
        ).matches;
        document.documentElement.classList.toggle("dark", prefersDark);
        localStorage.removeItem(THEME_KEY);
      }

      toast.success("Perfil atualizado");
    },
    onError: (e) => toast.error(formatMutationError("Erro ao atualizar perfil", e)),
  });

  const changePassword = useMutation({
    mutationFn: (data: PasswordValues) => api.patch("/auth/password", data),
    onSuccess: () => {
      toast.success("Senha alterada");
      passwordForm.reset();
    },
    onError: (e) => toast.error(formatMutationError("Erro ao alterar senha", e)),
  });

  if (isLoading) {
    return (
      <div className="p-4 md:p-6">
        <div className="mx-auto flex max-w-2xl items-center gap-3 text-sm text-[var(--color-muted)]">
          <span className="size-4 animate-spin rounded-full border-2 border-[var(--color-border-strong)] border-t-[var(--color-accent)]" />
          Carregando perfil…
        </div>
      </div>
    );
  }

  const watchedName = profileForm.watch("name");
  const watchedAvatar = profileForm.watch("avatarUrl");
  const initials = (watchedName || me?.name || me?.email || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part: string) => part.charAt(0).toUpperCase())
    .join("");

  return (
    <div className="p-4 md:p-6">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <header className="flex flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
            Conta
          </span>
          <h1 className="text-xl font-semibold text-[var(--color-text)] md:text-2xl">
            Meu perfil
          </h1>
          <p className="text-sm text-[var(--color-muted)]">
            Gerencie seus dados, preferências de interface e segurança.
          </p>
        </header>

        <section className="flex flex-col gap-4 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-xs)] sm:flex-row sm:items-center">
          {watchedAvatar ? (
            <img
              src={watchedAvatar}
              alt=""
              className="size-16 shrink-0 rounded-[var(--radius-full)] border border-[var(--color-border)] object-cover"
            />
          ) : (
            <div className="flex size-16 shrink-0 items-center justify-center rounded-[var(--radius-full)] bg-[var(--color-accent-soft)] text-lg font-semibold text-[var(--color-accent)]">
              {initials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold text-[var(--color-text)]">
              {watchedName || me?.name || "Sem nome"}
            </p>
            <p className="truncate text-sm text-[var(--color-muted)]">
              {me?.email ?? ""}
            </p>
          </div>
        </section>

        <form
          onSubmit={profileForm.handleSubmit((d) => updateProfile.mutate(d))}
          className="flex flex-col rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-xs)]"
        >
          <div className="flex items-center gap-3 border-b border-[var(--color-border)] p-5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
              <UserRound className="size-4" />
            </span>
            <div className="flex flex-col">
              <h2 className="text-lg font-semibold text-[var(--color-text)]">
                Dados pessoais
              </h2>
              <p className="text-xs text-[var(--color-muted)]">
                Informações exibidas no seu perfil.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4 p-5">
            <Input
              label="Nome"
              {...profileForm.register("name")}
              error={profileForm.formState.errors.name?.message}
            />
            <Input label="E-mail" value={me?.email ?? ""} disabled />
            <Input
              label="URL do Avatar"
              placeholder="https://…"
              {...profileForm.register("avatarUrl")}
              error={profileForm.formState.errors.avatarUrl?.message}
            />
          </div>

          <div className="flex items-center gap-3 border-y border-[var(--color-border)] p-5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
              <Settings2 className="size-4" />
            </span>
            <div className="flex flex-col">
              <h2 className="text-lg font-semibold text-[var(--color-text)]">
                Preferências
              </h2>
              <p className="text-xs text-[var(--color-muted)]">
                Aparência e comportamento da interface.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4 p-5">
            <Select
              label="Tema"
              options={THEME_OPTIONS}
              value={profileForm.watch("themePreference")}
              onChange={(v) =>
                profileForm.setValue(
                  "themePreference",
                  v as "light" | "dark" | "system",
                )
              }
            />
            <label
              htmlFor="pref-sidebar"
              className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 transition-colors hover:border-[var(--color-border-strong)]"
            >
              <input
                type="checkbox"
                id="pref-sidebar"
                {...profileForm.register("sidebarCollapsed")}
                className="mt-0.5 size-4 rounded border-[var(--color-border-strong)] accent-[var(--color-accent)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
              />
              <span className="flex min-w-0 flex-col">
                <span className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-text)]">
                  <PanelLeftClose className="size-3.5 text-[var(--color-muted)]" />
                  Sidebar recolhida por padrão
                </span>
                <span className="text-xs text-[var(--color-muted)]">
                  Inicia a navegação lateral compactada.
                </span>
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-2 rounded-b-[var(--radius-xl)] border-t border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
            <Button type="submit" loading={updateProfile.isPending}>
              Salvar perfil
            </Button>
          </div>
        </form>

        <form
          onSubmit={passwordForm.handleSubmit((d) => changePassword.mutate(d))}
          className="flex flex-col rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-xs)]"
        >
          <div className="flex items-center gap-3 border-b border-[var(--color-border)] p-5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
              <Lock className="size-4" />
            </span>
            <div className="flex flex-col">
              <h2 className="text-lg font-semibold text-[var(--color-text)]">
                Alterar senha
              </h2>
              <p className="text-xs text-[var(--color-muted)]">
                Use uma senha forte com pelo menos 6 caracteres.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4 p-5">
            <Input
              type="password"
              label="Senha atual"
              {...passwordForm.register("currentPassword")}
              error={passwordForm.formState.errors.currentPassword?.message}
            />
            <Input
              type="password"
              label="Nova senha"
              {...passwordForm.register("newPassword")}
              error={passwordForm.formState.errors.newPassword?.message}
            />
          </div>

          <div className="flex justify-end gap-2 rounded-b-[var(--radius-xl)] border-t border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
            <Button type="submit" loading={changePassword.isPending}>
              Alterar senha
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
