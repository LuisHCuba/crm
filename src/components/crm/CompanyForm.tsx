import { type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { gqlClient } from "../../lib/graphql";
import {
  CREATE_COMPANY,
  UPDATE_COMPANY,
  USERS_LIST,
  type Company,
  type UserRef,
} from "../../lib/queries/crm";
import { logActivity } from "../../lib/activity-log";
import { COMPANY_TYPE_LABELS } from "./labels";
import { Modal, SelectField, SubmitButton, TextArea, TextField } from "./ui";

export function CompanyForm({
  company,
  onClose,
  onSaved,
}: {
  company?: Company;
  onClose: () => void;
  onSaved: (newId?: string) => void;
}) {
  const editing = !!company;
  const { data: usersData } = useQuery({
    queryKey: ["users-mini"],
    queryFn: () => gqlClient.request<{ users: UserRef[] }>(USERS_LIST),
  });

  const mutation = useMutation({
    mutationFn: async (vars: Record<string, unknown>): Promise<string> => {
      if (editing) {
        await gqlClient.request(UPDATE_COMPANY, { id: company!.id, set: vars });
        return company!.id;
      }
      const res = await gqlClient.request<{
        insert_companies_one: { id: string };
      }>(CREATE_COMPANY, { obj: vars });
      return res.insert_companies_one.id;
    },
    onSuccess: (id) => {
      logActivity({
        title: editing ? "Empresa atualizada" : "Empresa criada",
        link: { companyId: id },
      });
      toast.success(editing ? "Empresa atualizada" : "Empresa criada");
      onSaved(id);
      onClose();
    },
    onError: () => toast.error("Erro ao salvar empresa"),
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const obj: Record<string, unknown> = {
      legal_name: fd.get("legal_name"),
      trade_name: fd.get("trade_name") || null,
      document: fd.get("document"),
      type: fd.get("type"),
      email: fd.get("email") || null,
      phone: fd.get("phone") || null,
      address: fd.get("address") || null,
      responsible_id: fd.get("responsible_id") || null,
    };
    mutation.mutate(obj);
  };

  return (
    <Modal
      title={editing ? "Editar empresa" : "Nova empresa"}
      onClose={onClose}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <TextField
            name="legal_name"
            label="Razão social"
            required
            defaultValue={company?.legal_name}
          />
          <TextField
            name="trade_name"
            label="Nome fantasia"
            defaultValue={company?.trade_name}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <TextField
            name="document"
            label="CNPJ / Documento"
            required
            defaultValue={company?.document}
          />
          <SelectField
            name="type"
            label="Tipo"
            required
            defaultValue={company?.type ?? "client"}
            options={Object.entries(COMPANY_TYPE_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <TextField
            name="email"
            label="E-mail"
            type="email"
            defaultValue={company?.email}
          />
          <TextField name="phone" label="Telefone" defaultValue={company?.phone} />
        </div>
        <TextArea
          name="address"
          label="Endereço"
          rows={2}
          defaultValue={company?.address}
        />
        <SelectField
          name="responsible_id"
          label="Responsável"
          defaultValue={company?.responsible?.id ?? ""}
          placeholder="— sem responsável —"
          options={(usersData?.users ?? []).map((u) => ({
            value: u.id,
            label: u.name,
          }))}
        />
        <SubmitButton loading={mutation.isPending} />
      </form>
    </Modal>
  );
}
