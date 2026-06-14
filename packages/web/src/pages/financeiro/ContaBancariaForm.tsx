import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, formatMutationError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { Drawer } from "@/components/ui/Drawer";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const schema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  bankName: z.string().optional(),
  branchAccount: z.string().optional(),
  initialBalance: z.string().min(1, "Saldo inicial obrigatório"),
  active: z.boolean().default(true),
});

type FormValues = z.infer<typeof schema>;

type ContaBancariaFormProps = {
  open: boolean;
  onClose: () => void;
  bankAccount?: {
    id: string;
    name?: string | null;
    bankName?: string | null;
    branchAccount?: string | null;
    initialBalance?: string | null;
    active?: boolean | null;
  };
};

export function ContaBancariaForm({ open, onClose, bankAccount }: ContaBancariaFormProps) {
  const qc = useQueryClient();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      bankName: "",
      branchAccount: "",
      initialBalance: "0",
      active: true,
    },
  });

  const active = watch("active");

  useEffect(() => {
    if (bankAccount) {
      reset({
        name: bankAccount.name ?? "",
        bankName: bankAccount.bankName ?? "",
        branchAccount: bankAccount.branchAccount ?? "",
        initialBalance: bankAccount.initialBalance ?? "0",
        active: bankAccount.active ?? true,
      });
    } else {
      reset({
        name: "",
        bankName: "",
        branchAccount: "",
        initialBalance: "0",
        active: true,
      });
    }
  }, [bankAccount, reset]);

  const mutation = useMutation({
    mutationFn: (data: FormValues) => {
      const payload = {
        ...data,
        bankName: data.bankName || null,
        branchAccount: data.branchAccount || null,
      };
      return bankAccount
        ? api.patch(`/contas-bancarias/${bankAccount.id}`, payload).then((r) => r.data)
        : api.post("/contas-bancarias", payload).then((r) => r.data);
    },
    onSuccess: () => {
      toast.success(bankAccount ? "Conta atualizada" : "Conta criada");
      qc.invalidateQueries({ queryKey: ["contas-bancarias"] });
      qc.invalidateQueries({ queryKey: ["bank-accounts-options"] });
      onClose();
    },
    onError: (e) =>
      toast.error(formatMutationError("Erro ao salvar conta bancária", e)),
  });

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={bankAccount ? "Editar conta bancária" : "Nova conta bancária"}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit((data) => mutation.mutate(data))}
            loading={mutation.isPending}
          >
            Salvar
          </Button>
        </div>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
        <Input
          label="Nome"
          {...register("name")}
          error={errors.name?.message}
        />

        <Input
          label="Banco"
          {...register("bankName")}
          placeholder="Ex: Banco do Brasil"
        />

        <Input
          label="Agência / Conta"
          {...register("branchAccount")}
          placeholder="Ex: 1234 / 56789-0"
        />

        <Input
          label="Saldo inicial"
          type="number"
          step="0.01"
          {...register("initialBalance")}
          error={errors.initialBalance?.message}
        />

        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={active}
            aria-label="Conta ativa"
            onClick={() => setValue("active", !active)}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-[var(--radius-full)] border-2 border-transparent outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]",
              active
                ? "bg-[var(--color-accent)]"
                : "bg-[color-mix(in_srgb,var(--color-muted)_30%,transparent)]",
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block size-5 rounded-[var(--radius-full)] bg-[var(--color-accent-contrast)] shadow-[var(--shadow-xs)] transition-transform",
                active ? "translate-x-5" : "translate-x-0",
              )}
            />
          </button>
          <span className="text-sm text-[var(--color-text)]">Ativa</span>
        </div>
      </form>
    </Drawer>
  );
}
