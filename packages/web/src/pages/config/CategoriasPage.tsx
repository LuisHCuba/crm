import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { api, extractData, formatMutationError } from "@/lib/api";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { QueryErrorState } from "@/components/ui/QueryErrorState";

const TYPE_OPTIONS = [
  { value: "revenue", label: "Receita" },
  { value: "expense", label: "Despesa" },
];

type Categoria = {
  id: string;
  name: string;
  type: "revenue" | "expense";
  active: boolean;
  archived?: boolean;
};

const categoriaSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  type: z.enum(["revenue", "expense"]),
  active: z.boolean(),
});

type CategoriaValues = z.infer<typeof categoriaSchema>;

function CategoriaDrawer({
  open,
  onClose,
  categoria,
}: {
  open: boolean;
  onClose: () => void;
  categoria: Categoria | null;
}) {
  const queryClient = useQueryClient();
  const isEdit = !!categoria;

  const form = useForm<CategoriaValues>({
    resolver: zodResolver(categoriaSchema),
    defaultValues: { name: "", type: "revenue", active: true },
  });

  useEffect(() => {
    if (isEdit && categoria) {
      form.reset({
        name: categoria.name,
        type: categoria.type,
        active: categoria.active,
      });
    }
    if (!isEdit) form.reset({ name: "", type: "revenue", active: true });
  }, [isEdit, categoria, form]);

  const save = useMutation({
    mutationFn: (data: CategoriaValues) =>
      isEdit
        ? api.patch(`/categorias-financeiras/${categoria!.id}`, data)
        : api.post("/categorias-financeiras", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorias-financeiras"] });
      queryClient.invalidateQueries({ queryKey: ["categories-options"] });
      toast.success(isEdit ? "Categoria atualizada" : "Categoria criada");
      onClose();
    },
    onError: (e) => toast.error(formatMutationError("Erro ao salvar categoria", e)),
  });

  const archive = useMutation({
    mutationFn: () => api.delete(`/categorias-financeiras/${categoria!.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorias-financeiras"] });
      queryClient.invalidateQueries({ queryKey: ["categories-options"] });
      toast.success("Categoria arquivada");
      onClose();
    },
    onError: (e) => toast.error(formatMutationError("Erro ao arquivar categoria", e)),
  });

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? "Editar categoria" : "Nova categoria"}
      footer={
        <div className="flex items-center justify-between gap-2">
          {isEdit ? (
            <Button
              variant="ghost"
              className="text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)]"
              onClick={() => archive.mutate()}
              loading={archive.isPending}
            >
              <Trash2 className="size-4" /> Arquivar
            </Button>
          ) : <div />}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              loading={save.isPending}
              onClick={form.handleSubmit((d) => save.mutate(d))}
            >
              Salvar
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <Input
          label="Nome"
          {...form.register("name")}
          error={form.formState.errors.name?.message}
        />
        <Select
          label="Tipo"
          options={TYPE_OPTIONS}
          value={form.watch("type")}
          onChange={(v) => form.setValue("type", v as "revenue" | "expense")}
        />
        <label
          htmlFor="cat-active"
          className="flex items-center gap-2.5 text-sm text-[var(--color-text)]"
        >
          <input
            type="checkbox"
            id="cat-active"
            {...form.register("active")}
            className="size-4 rounded-[var(--radius-xs)] border-[var(--color-border-strong)] accent-[var(--color-accent)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]"
          />
          Categoria ativa
        </label>
      </div>
    </Drawer>
  );
}

export function CategoriasPage() {
  const [selected, setSelected] = useState<Categoria | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["categorias-financeiras", { showArchived }],
    queryFn: () =>
      api
        .get("/categorias-financeiras", { params: showArchived ? { includeArchived: "true" } : {} })
        .then((r) => extractData<Categoria>(r)),
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/categorias-financeiras/${id}/restore`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorias-financeiras"] });
      queryClient.invalidateQueries({ queryKey: ["categories-options"] });
      toast.success("Categoria restaurada");
    },
    onError: (e) => toast.error(formatMutationError("Erro ao restaurar", e)),
  });

  const columns: DataTableColumn<Categoria>[] = [
    { key: "name", header: "Nome" },
    {
      key: "type",
      header: "Tipo",
      render: (row) => (
        <Badge variant={row.type === "revenue" ? "success" : "danger"}>
          {row.type === "revenue" ? "Receita" : "Despesa"}
        </Badge>
      ),
    },
    {
      key: "active",
      header: "Ativa",
      render: (row) => (
        <Badge variant={row.active ? "success" : "neutral"}>
          {row.active ? "Sim" : "Não"}
        </Badge>
      ),
    },
    ...(showArchived
      ? [
          {
            key: "actions" as keyof Categoria,
            header: "",
            render: (row: Categoria) =>
              row.archived ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    restoreMutation.mutate(row.id);
                  }}
                >
                  <RotateCcw className="size-4" /> Restaurar
                </Button>
              ) : null,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-[var(--color-text)] sm:text-2xl">
            Categorias financeiras
          </h1>
          <p className="text-sm text-[var(--color-muted)]">
            Organize receitas e despesas em categorias reutilizáveis.
          </p>
        </div>
        <Button
          className="shrink-0"
          onClick={() => {
            setSelected(null);
            setDrawerOpen(true);
          }}
        >
          <Plus className="size-4" /> Nova categoria
        </Button>
      </div>

      <label
        htmlFor="show-archived-cats"
        className="inline-flex items-center gap-2.5 text-sm text-[var(--color-muted)]"
      >
        <input
          type="checkbox"
          id="show-archived-cats"
          checked={showArchived}
          onChange={() => setShowArchived(!showArchived)}
          className="size-4 rounded-[var(--radius-xs)] border-[var(--color-border-strong)] accent-[var(--color-accent)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]"
        />
        Mostrar arquivadas
      </label>

      {isError ? (
        <QueryErrorState
          message="Não foi possível carregar as categorias."
          onRetry={() => refetch()}
        />
      ) : (
        <DataTable
          columns={columns}
          data={data ?? []}
          loading={isLoading}
          getRowKey={(row) => row.id}
          emptyMessage={
            showArchived
              ? "Nenhuma categoria arquivada."
              : "Nenhuma categoria cadastrada ainda."
          }
          onRowClick={(row) => {
            setSelected(row);
            setDrawerOpen(true);
          }}
        />
      )}

      <CategoriaDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        categoria={selected}
      />
    </div>
  );
}
