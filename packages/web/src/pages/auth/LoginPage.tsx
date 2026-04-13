import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import axios from "axios";
import { z } from "zod";
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
    <div
      className={cn(
        "flex min-h-dvh items-center justify-center px-4 py-10",
        "bg-[var(--color-bg)]",
      )}
    >
      <div
        className={cn(
          "w-full max-w-[400px] rounded-2xl border border-[var(--color-border)]",
          "bg-[var(--color-surface)] p-8 shadow-sm",
        )}
      >
        <h1 className="mb-8 text-center text-2xl font-semibold tracking-tight text-[var(--color-text)]">
          MeuCRM
        </h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="E-mail"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register("email")}
          />
          <Input
            label="Senha"
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register("password")}
          />

          <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
            Entrar
          </Button>
        </form>

        <div className="mt-4 text-center">
          <Link
            to="/recuperar-senha"
            className="text-sm font-medium text-[var(--color-accent)] hover:underline"
          >
            Esqueci minha senha
          </Link>
        </div>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-[var(--color-border)]" />
          <span className="text-xs text-[var(--color-muted)]">— ou —</span>
          <div className="h-px flex-1 bg-[var(--color-border)]" />
        </div>

        <Button type="button" variant="secondary" className="w-full" size="lg" disabled>
          Entrar com Google
        </Button>
      </div>
    </div>
  );
}
