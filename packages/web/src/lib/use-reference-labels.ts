import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import api, { extractData } from "@/lib/api";
import {
  type ReferenceLookups,
  formatAuditAction,
  formatFieldName,
  formatObjectType,
  resolveReferenceValue,
  resolveRecordLabel,
} from "@/lib/reference-labels";

function toArray(d: unknown): Record<string, unknown>[] {
  if (Array.isArray(d)) return d as Record<string, unknown>[];
  if (d && typeof d === "object" && Array.isArray((d as { data?: unknown }).data)) {
    return (d as { data: Record<string, unknown>[] }).data;
  }
  return [];
}

function companyLabel(item: Record<string, unknown>): string {
  const trade = item.tradeName as string | null | undefined;
  const legal = item.legalName as string | undefined;
  return trade?.trim() || legal || (item.id as string);
}

function buildMap(
  items: Record<string, unknown>[],
  labelFn: (item: Record<string, unknown>) => string,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const item of items) {
    const id = item.id;
    if (typeof id === "string" && id.length > 0) {
      map.set(id, labelFn(item));
    }
  }
  return map;
}

export function useReferenceLabels() {
  const { data: usersRaw } = useQuery({
    queryKey: ["reference-users"],
    queryFn: async () => {
      const res = await api.get("/auth/users");
      return toArray(res.data);
    },
    staleTime: 60_000,
  });

  const { data: companiesRaw } = useQuery({
    queryKey: ["reference-companies"],
    queryFn: async () => {
      const res = await api.get("/empresas", { params: { perPage: 100 } });
      return toArray(res.data);
    },
    staleTime: 60_000,
  });

  const { data: contactsRaw } = useQuery({
    queryKey: ["reference-contacts"],
    queryFn: async () => {
      const res = await api.get("/contatos", { params: { perPage: 100 } });
      return toArray(res.data);
    },
    staleTime: 60_000,
  });

  const { data: productsRaw } = useQuery({
    queryKey: ["reference-products"],
    queryFn: async () => {
      const res = await api.get("/produtos", { params: { perPage: 100 } });
      return toArray(res.data);
    },
    staleTime: 60_000,
  });

  const { data: dealsRaw } = useQuery({
    queryKey: ["reference-deals"],
    queryFn: async () => {
      const res = await api.get("/negocios", { params: { perPage: 100 } });
      return toArray(res.data);
    },
    staleTime: 60_000,
  });

  const { data: categoriesRaw } = useQuery({
    queryKey: ["reference-categories"],
    queryFn: async () => {
      const res = await api.get("/categorias-financeiras");
      return toArray(res.data);
    },
    staleTime: 60_000,
  });

  const { data: bankAccountsRaw } = useQuery({
    queryKey: ["reference-bank-accounts"],
    queryFn: async () => {
      const res = await api.get("/contas-bancarias");
      return toArray(res.data);
    },
    staleTime: 60_000,
  });

  const { data: projectsRaw } = useQuery({
    queryKey: ["reference-projects"],
    queryFn: async () => {
      const res = await api.get("/projetos", { params: { perPage: 100 } });
      return toArray(res.data);
    },
    staleTime: 60_000,
  });

  const { data: tasksRaw } = useQuery({
    queryKey: ["reference-tasks"],
    queryFn: async () => {
      const res = await api.get("/projetos/tarefas", { params: { perPage: 100 } });
      return extractData<Record<string, unknown>>(res);
    },
    staleTime: 60_000,
  });

  const { data: pipelineStagesRaw } = useQuery({
    queryKey: ["reference-pipeline-stages"],
    queryFn: async () => {
      const listRes = await api.get("/pipelines");
      const pipelines = toArray(listRes.data);
      const full = await Promise.all(
        pipelines.map(async (p) => {
          const id = p.id as string;
          const res = await api.get(`/pipelines/${id}`);
          return res.data as {
            id: string;
            name: string;
            stages?: { id: string; name: string }[];
          };
        }),
      );
      return full;
    },
    staleTime: 60_000,
  });

  const { data: projectStagesRaw } = useQuery({
    queryKey: ["reference-project-stages"],
    queryFn: async () => {
      const res = await api.get("/projetos", { params: { perPage: 100 } });
      const projects = toArray(res.data);
      const allStages: { id: string; name: string }[] = [];
      await Promise.all(
        projects.map(async (p) => {
          const id = p.id as string;
          const stagesRes = await api.get(`/projetos/${id}/etapas`);
          const stages = toArray(stagesRes.data);
          for (const s of stages) {
            if (typeof s.id === "string" && typeof s.name === "string") {
              allStages.push({ id: s.id, name: s.name });
            }
          }
        }),
      );
      return allStages;
    },
    staleTime: 60_000,
  });

  const lookups = useMemo((): ReferenceLookups => {
    const users = buildMap(usersRaw ?? [], (u) => (u.name as string) ?? (u.id as string));
    const companies = buildMap(companiesRaw ?? [], companyLabel);
    const contacts = buildMap(contactsRaw ?? [], (c) => (c.fullName as string) ?? (c.id as string));
    const products = buildMap(productsRaw ?? [], (p) => (p.name as string) ?? (p.id as string));
    const deals = buildMap(dealsRaw ?? [], (d) => (d.title as string) ?? (d.id as string));
    const categories = buildMap(categoriesRaw ?? [], (c) => (c.name as string) ?? (c.id as string));
    const bankAccounts = buildMap(bankAccountsRaw ?? [], (b) => (b.name as string) ?? (b.id as string));
    const projects = buildMap(projectsRaw ?? [], (p) => (p.title as string) ?? (p.id as string));
    const tasks = buildMap(tasksRaw ?? [], (t) => (t.title as string) ?? (t.id as string));

    const pipelines = new Map<string, string>();
    const stages = new Map<string, string>();

    for (const pipeline of pipelineStagesRaw ?? []) {
      pipelines.set(pipeline.id, pipeline.name);
      for (const stage of pipeline.stages ?? []) {
        stages.set(stage.id, stage.name);
      }
    }

    for (const stage of projectStagesRaw ?? []) {
      stages.set(stage.id, stage.name);
    }

    return {
      users,
      companies,
      contacts,
      products,
      pipelines,
      stages,
      deals,
      categories,
      bankAccounts,
      projects,
      tasks,
    };
  }, [
    usersRaw,
    companiesRaw,
    contactsRaw,
    productsRaw,
    dealsRaw,
    categoriesRaw,
    bankAccountsRaw,
    projectsRaw,
    tasksRaw,
    pipelineStagesRaw,
    projectStagesRaw,
  ]);

  return {
    lookups,
    formatField: formatFieldName,
    formatAction: formatAuditAction,
    formatObjectType,
    resolveValue: (field: string | null | undefined, value: string | null | undefined) =>
      resolveReferenceValue(field, value, lookups),
    resolveRecord: (objectType: string, recordId: string) =>
      resolveRecordLabel(objectType, recordId, lookups),
    userMap: lookups.users,
    companyMap: lookups.companies,
    contactMap: lookups.contacts,
    productMap: lookups.products,
    dealMap: lookups.deals,
    projectMap: lookups.projects,
    taskMap: lookups.tasks,
    stageMap: lookups.stages,
  };
}
