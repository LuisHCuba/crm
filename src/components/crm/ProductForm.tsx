import { type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { gqlClient } from "../../lib/graphql";
import {
  CREATE_PRODUCT,
  UPDATE_PRODUCT,
  type Product,
} from "../../lib/queries/crm";
import { Modal, SelectField, SubmitButton, TextArea, TextField } from "./ui";

export function ProductForm({
  product,
  onClose,
  onSaved,
}: {
  product?: Product;
  onClose: () => void;
  onSaved: (newId?: string) => void;
}) {
  const editing = !!product;

  const mutation = useMutation({
    mutationFn: async (vars: Record<string, unknown>): Promise<string> => {
      if (editing) {
        await gqlClient.request(UPDATE_PRODUCT, { id: product!.id, set: vars });
        return product!.id;
      }
      const res = await gqlClient.request<{
        insert_products_one: { id: string };
      }>(CREATE_PRODUCT, { obj: vars });
      return res.insert_products_one.id;
    },
    onSuccess: (id) => {
      toast.success(editing ? "Produto atualizado" : "Produto criado");
      onSaved(id);
      onClose();
    },
    onError: () => toast.error("Erro ao salvar produto"),
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const obj: Record<string, unknown> = {
      name: fd.get("name"),
      sku: fd.get("sku") || null,
      description: fd.get("description") || null,
      base_price: Number(fd.get("base_price")),
      unit: fd.get("unit"),
      active: fd.get("active") === "true",
    };
    mutation.mutate(obj);
  };

  return (
    <Modal
      title={editing ? "Editar produto" : "Novo produto"}
      onClose={onClose}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField name="name" label="Nome" required defaultValue={product?.name} />
        <div className="grid grid-cols-2 gap-4">
          <TextField name="sku" label="SKU" defaultValue={product?.sku} />
          <TextField
            name="unit"
            label="Unidade"
            required
            placeholder="un, hora, mês..."
            defaultValue={product?.unit}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <TextField
            name="base_price"
            label="Preço base (R$)"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={product?.base_price}
          />
          <SelectField
            name="active"
            label="Status"
            defaultValue={product ? String(product.active) : "true"}
            options={[
              { value: "true", label: "Ativo" },
              { value: "false", label: "Inativo" },
            ]}
          />
        </div>
        <TextArea
          name="description"
          label="Descrição"
          rows={3}
          defaultValue={product?.description}
        />
        <SubmitButton loading={mutation.isPending} />
      </form>
    </Modal>
  );
}
