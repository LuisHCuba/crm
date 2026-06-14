import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { api, formatMutationError } from "@/lib/api";
import { cn } from "@/lib/cn";

const schema = z
  .object({
    newPassword: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
    confirmPassword: z.string().min(1, "Confirme a senha"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "As senhas não conferem",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  async function onSubmit(values: FormValues) {
    try {
      await api.post("/auth/reset-password", {
        token,
        newPassword: values.newPassword,
      });
      toast.success("Senha redefinida com sucesso. Faça login.");
      navigate("/login", { replace: true });
    } catch (err) {
      toast.error(formatMutationError("Não foi possível redefinir a senha", err));
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
        <h1 className="mb-2 text-center text-xl font-semibold text-[var(--color-text)]">
          Redefinir senha
        </h1>
        <p className="mb-6 text-center text-sm text-[var(--color-muted)]">
          Escolha uma nova senha para sua conta.
        </p>

        {!token ? (
          <p className="text-center text-sm text-[var(--color-muted)]">
            Link inválido ou incompleto. Solicite um novo link de recuperação.
          </p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Nova senha"
              type="password"
              autoComplete="new-password"
              error={errors.newPassword?.message}
              {...register("newPassword")}
            />
            <Input
              label="Confirmar nova senha"
              type="password"
              autoComplete="new-password"
              error={errors.confirmPassword?.message}
              {...register("confirmPassword")}
            />
            <Button type="submit" className="w-full" loading={isSubmitting}>
              Redefinir senha
            </Button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="text-sm font-medium text-[var(--color-accent)] hover:underline"
          >
            Voltar ao login
          </Link>
        </div>
      </div>
    </div>
  );
}
