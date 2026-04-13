import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
      <p className="text-[var(--color-muted)]">Carregando…</p>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <h1 className="text-2xl font-bold text-[var(--color-text)]">
        Meu perfil
      </h1>

      <form
        onSubmit={profileForm.handleSubmit((d) => updateProfile.mutate(d))}
        className="space-y-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
      >
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
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="pref-sidebar"
            {...profileForm.register("sidebarCollapsed")}
            className="size-4 rounded border-[var(--color-border)] accent-[var(--color-accent)]"
          />
          <label
            htmlFor="pref-sidebar"
            className="text-sm text-[var(--color-text)]"
          >
            Sidebar recolhida por padrão
          </label>
        </div>
        <Button type="submit" loading={updateProfile.isPending}>
          Salvar perfil
        </Button>
      </form>

      <form
        onSubmit={passwordForm.handleSubmit((d) => changePassword.mutate(d))}
        className="space-y-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
      >
        <h2 className="text-lg font-semibold text-[var(--color-text)]">
          Alterar senha
        </h2>
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
        <Button type="submit" loading={changePassword.isPending}>
          Alterar senha
        </Button>
      </form>
    </div>
  );
}
