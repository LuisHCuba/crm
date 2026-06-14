import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import axios from "axios";
import { z } from "zod";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useAuthStore } from "@/stores/auth-store";

const loginSchema = z.object({
  email: z.string().min(1, "E-mail obrigatório").email("E-mail inválido"),
  password: z.string().min(1, "Senha obrigatória"),
});

type LoginForm = z.infer<typeof loginSchema>;

type LoginResponse = {
  user: Record<string, unknown>;
  token: string;
};

export default function LoginPage() {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const login = useAuthStore((s) => s.login);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (token) {
      navigate("/", { replace: true });
    }
  }, [token, navigate]);

  async function onSubmit(values: LoginForm) {
    try {
      const { data } = await api.post<LoginResponse>("/auth/login", values);
      login(data.user, data.token);
      toast.success("Login realizado com sucesso.");
      navigate("/", { replace: true });
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        const msg =
          typeof err.response.data?.message === "string"
            ? err.response.data.message
            : "E-mail ou senha inválidos";
        toast.error(msg);
        return;
      }
      toast.error("Não foi possível entrar. Tente novamente.");
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--color-bg)] px-4 py-10 sm:px-6">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <span className="flex size-12 items-center justify-center rounded-[var(--radius-xl)] bg-[var(--color-accent)] text-[var(--color-accent-contrast)] shadow-[var(--shadow-sm)]">
            <Building2 className="size-6" aria-hidden />
          </span>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">
              CRM-X
            </h1>
            <p className="text-sm text-[var(--color-muted)]">
              Entre na sua conta para continuar
            </p>
          </div>
        </div>

        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-sm)] sm:p-8">
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
            noValidate
          >
            <Input
              label="E-mail"
              type="email"
              autoComplete="email"
              placeholder="voce@empresa.com"
              error={errors.email?.message}
              {...register("email")}
            />
            <Input
              label="Senha"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register("password")}
            />

            <Button
              type="submit"
              className="mt-2 w-full"
              size="lg"
              loading={isSubmitting}
            >
              Entrar
            </Button>
          </form>

          <div className="mt-6 flex justify-center border-t border-[var(--color-border)] pt-5">
            <Link
              to="/recuperar-senha"
              className={cn(
                "rounded-[var(--radius-sm)] px-1 text-sm font-medium text-[var(--color-accent)] transition-colors hover:underline",
                "outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]",
              )}
            >
              Esqueci minha senha
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
