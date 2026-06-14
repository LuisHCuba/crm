import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { ArrowLeft, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { api, formatMutationError } from "@/lib/api";
import { cn } from "@/lib/cn";

const schema = z.object({
  email: z.string().min(1, "E-mail obrigatório").email("E-mail inválido"),
});

type FormValues = z.infer<typeof schema>;

export default function RecoverPasswordPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: FormValues) {
    try {
      await api.post("/auth/forgot-password", values);
      toast.success(
        "Se o e-mail existir, enviaremos um link de recuperação em instantes."
      );
      reset();
    } catch (err) {
      toast.error(formatMutationError("Não foi possível enviar o link", err));
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--color-bg)] px-4 py-10 sm:px-6">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <span className="flex size-12 items-center justify-center rounded-[var(--radius-xl)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
            <KeyRound className="size-6" aria-hidden />
          </span>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">
              Recuperar senha
            </h1>
            <p className="text-sm text-[var(--color-muted)]">
              Informe seu e-mail para receber o link de redefinição.
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
            <Button
              type="submit"
              className="mt-2 w-full"
              size="lg"
              loading={isSubmitting}
            >
              Enviar link de recuperação
            </Button>
          </form>

          <div className="mt-6 flex justify-center border-t border-[var(--color-border)] pt-5">
            <Link
              to="/login"
              className={cn(
                "inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-1 text-sm font-medium text-[var(--color-accent)] transition-colors hover:underline",
                "outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]",
              )}
            >
              <ArrowLeft className="size-4" aria-hidden />
              Voltar ao login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
