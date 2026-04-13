import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "./api";

type Option = { value: string; label: string };

function toArray(d: any): any[] {
  if (Array.isArray(d)) return d;
  if (d && Array.isArray(d.data)) return d.data;
  return [];
}

function mapOptions(data: any[], labelKey: string): Option[] {
  return (data ?? [])
    .filter((item: any) => typeof item?.id === "string" && item.id.length > 0)
    .map((item: any) => ({
      value: item.id,
      label: item[labelKey] ?? item.id,
    }));
}

export function useUserOptions() {
  const { data } = useQuery({
    queryKey: ["users-options"],
    queryFn: async () => {
      const res = await api.get("/auth/users");
      return toArray(res.data);
    },
    staleTime: 60_000,
  });
  return useMemo(() => mapOptions(data ?? [], "name"), [data]);
}

export function useCompanyOptions() {
  const { data } = useQuery({
    queryKey: ["companies-options"],
    queryFn: async () => {
      const res = await api.get("/empresas", { params: { perPage: 100 } });
      return toArray(res.data);
    },
    staleTime: 60_000,
  });
  return useMemo(() => mapOptions(data ?? [], "legalName"), [data]);
}

/** Lista contatos para selects. Opcionalmente filtra por empresa vinculada (`companyId`). */
export function useContactOptions(companyId?: string) {
  const { data } = useQuery({
    queryKey: ["contacts-options", companyId ?? "all"],
    queryFn: async () => {
      const params: Record<string, string | number> = { perPage: 100 };
      if (companyId) params.companyId = companyId;
      const res = await api.get("/contatos", { params });
      return toArray(res.data);
    },
    staleTime: 60_000,
  });
  return useMemo(() => mapOptions(data ?? [], "fullName"), [data]);
}

export function useProductOptions() {
  const { data } = useQuery({
    queryKey: ["products-options"],
    queryFn: async () => {
      const res = await api.get("/produtos", { params: { perPage: 100 } });
      return toArray(res.data);
    },
    staleTime: 60_000,
  });
  return useMemo(() => mapOptions(data ?? [], "name"), [data]);
}

export function usePipelineOptions() {
  const { data } = useQuery({
    queryKey: ["pipelines-options"],
    queryFn: async () => {
      const res = await api.get("/pipelines");
      return toArray(res.data);
    },
    staleTime: 60_000,
  });
  return useMemo(() => mapOptions(data ?? [], "name"), [data]);
}

export function usePipelineStageOptions(pipelineId: string | undefined) {
  const { data } = useQuery({
    queryKey: ["pipeline-stages-options", pipelineId],
    queryFn: async () => {
      if (!pipelineId) return [];
      const res = await api.get(`/pipelines/${pipelineId}`);
      return toArray(res.data?.stages ?? res.data);
    },
    enabled: !!pipelineId,
    staleTime: 60_000,
  });
  return useMemo(() => mapOptions(data ?? [], "name"), [data]);
}

export function useCategoryOptions(type?: "revenue" | "expense") {
  const { data } = useQuery({
    queryKey: ["categories-options", type],
    queryFn: async () => {
      const res = await api.get("/categorias-financeiras");
      return toArray(res.data);
    },
    staleTime: 60_000,
  });
  return useMemo(() => {
    const arr = data ?? [];
    const filtered = type ? arr.filter((c: any) => c.type === type) : arr;
    return mapOptions(filtered, "name");
  }, [data, type]);
}

export function useBankAccountOptions() {
  const { data } = useQuery({
    queryKey: ["bank-accounts-options"],
    queryFn: async () => {
      const res = await api.get("/contas-bancarias");
      return toArray(res.data);
    },
    staleTime: 60_000,
  });
  return useMemo(() => mapOptions(data ?? [], "name"), [data]);
}

export function useDealOptions() {
  const { data } = useQuery({
    queryKey: ["deals-options"],
    queryFn: async () => {
      const res = await api.get("/negocios", { params: { perPage: 100 } });
      return toArray(res.data);
    },
    staleTime: 60_000,
  });
  return useMemo(() => mapOptions(data ?? [], "title"), [data]);
}
