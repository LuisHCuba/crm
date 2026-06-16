import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { gqlClient } from "../../lib/graphql";
import {
  COMPANIES_MINI,
  CREATE_DEAL,
  PIPELINES_WITH_STAGES,
  UPDATE_DEAL,
  USERS_LIST,
  type CompanyRef,
  type Deal,
  type Pipeline,
  type Stage,
  type UserRef,
} from "../../lib/queries/crm";
import { useAuth } from "../../store/auth";
import { logActivity } from "../../lib/activity-log";
import {
  Modal,
  SelectField,
  SubmitButton,
  TextField,
  fieldInputClass,
} from "./ui";

export function DealForm({
  deal,
  initialCompanyId,
  onClose,
  onSaved,
}: {
  deal?: Deal;
  /** Pré-seleciona a empresa ao criar (usado a partir do detalhe da empresa). */
  initialCompanyId?: string;
  onClose: () => void;
  onSaved: (newId?: string) => void;
}) {
  const editing = !!deal;
  const user = useAuth((s) => s.user);

  const { data: pipeData } = useQuery({
    queryKey: ["pipelines-stages"],
    queryFn: () =>
      gqlClient.request<{ pipelines: Pipeline[]; pipeline_stages: Stage[] }>(
        PIPELINES_WITH_STAGES
      ),
  });
  const { data: companiesData } = useQuery({
    queryKey: ["companies-mini"],
    queryFn: () => gqlClient.request<{ companies: CompanyRef[] }>(COMPANIES_MINI),
  });
  const { data: usersData } = useQuery({
    queryKey: ["users-mini"],
    queryFn: () => gqlClient.request<{ users: UserRef[] }>(USERS_LIST),
  });

  const [pipelineId, setPipelineId] = useState(
    deal?.pipeline_id ?? ""
  );

  const pipelines = pipeData?.pipelines ?? [];
  const effectivePipeline = pipelineId || pipelines[0]?.id || "";

  const stages = useMemo(
    () =>
      (pipeData?.pipeline_stages ?? []).filter(
        (s) => s.pipeline_id === effectivePipeline
      ),
    [pipeData, effectivePipeline]
  );

  const mutation = useMutation({
    mutationFn: (vars: Record<string, unknown>) =>
      editing
        ? gqlClient
            .request<{ update_deals_by_pk: { id: string } }>(UPDATE_DEAL, {
              id: deal!.id,
              set: vars,
            })
            .then((r) => r.update_deals_by_pk.id)
        : gqlClient
            .request<{ insert_deals_one: { id: string } }>(CREATE_DEAL, {
              obj: vars,
            })
            .then((r) => r.insert_deals_one.id),
    onSuccess: (id, vars) => {
      logActivity({
        title: editing ? "Negócio atualizado" : "Negócio criado",
        link: {
          dealId: id,
          companyId: (vars.company_id as string | null) ?? undefined,
        },
      });
      toast.success(editing ? "Negócio atualizado" : "Negócio criado");
      onSaved(id);
      onClose();
    },
    onError: () => toast.error("Erro ao salvar negócio"),
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const fd = new FormData(e.currentTarget);
    const obj: Record<string, unknown> = {
      title: fd.get("title"),
      pipeline_id: fd.get("pipeline_id"),
      stage_id: fd.get("stage_id"),
      company_id: fd.get("company_id") || null,
      total_value: fd.get("total_value") ? Number(fd.get("total_value")) : null,
      forecast_date: fd.get("forecast_date") || null,
      responsible_id: fd.get("responsible_id") || user.id,
    };
    mutation.mutate(obj);
  };

  return (
    <Modal
      title={editing ? "Editar negócio" : "Novo negócio"}
      onClose={onClose}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          name="title"
          label="Título do negócio"
          required
          defaultValue={deal?.title}
        />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Pipeline<span className="text-red-500"> *</span>
            </label>
            <select
              name="pipeline_id"
              required
              value={effectivePipeline}
              onChange={(e) => setPipelineId(e.target.value)}
              className={fieldInputClass}
            >
              {pipelines.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <SelectField
            key={effectivePipeline}
            name="stage_id"
            label="Estágio"
            required
            defaultValue={deal?.stage_id ?? stages[0]?.id ?? ""}
            options={stages.map((s) => ({ value: s.id, label: s.name }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <SelectField
            name="company_id"
            label="Empresa"
            defaultValue={deal?.company_id ?? initialCompanyId ?? ""}
            placeholder="— sem empresa —"
            options={(companiesData?.companies ?? []).map((c) => ({
              value: c.id,
              label: c.trade_name || c.legal_name,
            }))}
          />
          <SelectField
            name="responsible_id"
            label="Responsável"
            defaultValue={deal?.responsible?.id ?? user?.id ?? ""}
            options={(usersData?.users ?? []).map((u) => ({
              value: u.id,
              label: u.name,
            }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <TextField
            name="total_value"
            label="Valor (R$)"
            type="number"
            step="0.01"
            min="0"
            defaultValue={deal?.total_value}
          />
          <TextField
            name="forecast_date"
            label="Previsão de fechamento"
            type="date"
            defaultValue={deal?.forecast_date}
          />
        </div>
        <SubmitButton loading={mutation.isPending} />
      </form>
    </Modal>
  );
}
