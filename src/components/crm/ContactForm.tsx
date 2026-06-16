import { type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { gqlClient } from "../../lib/graphql";
import {
  CREATE_CONTACT_FULL,
  UPDATE_CONTACT_FULL,
  USERS_LIST,
  type Contact,
  type UserRef,
} from "../../lib/queries/crm";
import { logActivity } from "../../lib/activity-log";
import { CONTACT_ORIGIN_LABELS, CONTACT_STAGE_LABELS } from "./labels";
import { Modal, SelectField, SubmitButton, TextField } from "./ui";

export function ContactForm({
  contact,
  onClose,
  onSaved,
}: {
  contact?: Contact;
  onClose: () => void;
  onSaved: (newId?: string) => void;
}) {
  const editing = !!contact;
  const { data: usersData } = useQuery({
    queryKey: ["users-mini"],
    queryFn: () => gqlClient.request<{ users: UserRef[] }>(USERS_LIST),
  });

  const mutation = useMutation({
    mutationFn: async (vars: Record<string, unknown>): Promise<string> => {
      if (editing) {
        await gqlClient.request(UPDATE_CONTACT_FULL, {
          id: contact!.id,
          set: vars,
        });
        return contact!.id;
      }
      const res = await gqlClient.request<{
        insert_contacts_one: { id: string };
      }>(CREATE_CONTACT_FULL, { obj: vars });
      return res.insert_contacts_one.id;
    },
    onSuccess: (id) => {
      logActivity({
        title: editing ? "Contato atualizado" : "Contato criado",
        link: { contactId: id },
      });
      toast.success(editing ? "Contato atualizado" : "Contato criado");
      onSaved(id);
      onClose();
    },
    onError: () => toast.error("Erro ao salvar contato"),
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const obj: Record<string, unknown> = {
      full_name: fd.get("full_name"),
      email: fd.get("email") || null,
      phone: fd.get("phone") || null,
      job_title: fd.get("job_title") || null,
      stage: fd.get("stage"),
      origin: fd.get("origin") || null,
      responsible_id: fd.get("responsible_id") || null,
    };
    mutation.mutate(obj);
  };

  return (
    <Modal
      title={editing ? "Editar contato" : "Novo contato"}
      onClose={onClose}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          name="full_name"
          label="Nome completo"
          required
          defaultValue={contact?.full_name}
        />
        <div className="grid grid-cols-2 gap-4">
          <TextField
            name="email"
            label="E-mail"
            type="email"
            defaultValue={contact?.email}
          />
          <TextField name="phone" label="Telefone" defaultValue={contact?.phone} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <TextField
            name="job_title"
            label="Cargo"
            defaultValue={contact?.job_title}
          />
          <SelectField
            name="stage"
            label="Ciclo de vida"
            required
            defaultValue={contact?.stage ?? "new"}
            options={Object.entries(CONTACT_STAGE_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <SelectField
            name="origin"
            label="Origem"
            defaultValue={contact?.origin ?? ""}
            placeholder="— sem origem —"
            options={Object.entries(CONTACT_ORIGIN_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
          />
          <SelectField
            name="responsible_id"
            label="Responsável"
            defaultValue={contact?.responsible?.id ?? ""}
            placeholder="— sem responsável —"
            options={(usersData?.users ?? []).map((u) => ({
              value: u.id,
              label: u.name,
            }))}
          />
        </div>
        <SubmitButton loading={mutation.isPending} />
      </form>
    </Modal>
  );
}
