import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
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

  function onSubmit() {
    toast.success("Se o e-mail existir, enviaremos um link de recuperação em instantes.");
    reset();
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
          Recuperar senha
        </h1>
        <p className="mb-6 text-center text-sm text-[var(--color-muted)]">
          Informe seu e-mail para receber o link de redefinição.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="E-mail"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register("email")}
          />
          <Button type="submit" className="w-full" loading={isSubmitting}>
            Enviar link de recuperação
          </Button>
        </form>

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
