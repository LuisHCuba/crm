import axios from "axios";
import { AUTH_STORAGE_KEY, useAuthStore } from "@/stores/auth-store";

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

/**
 * Extrai mensagem útil de erro da API (Zod issues, message, etc.) para exibir no toast.
 * Use com Network (aba Response) para depurar falhas de CRUD.
 */
export function getApiErrorDetail(error: unknown): string | null {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (isRecord(data)) {
      if (typeof data.message === "string" && data.message.trim()) {
        return data.message.trim();
      }
      if (data.error === "Validation" && Array.isArray(data.issues)) {
        for (const issue of data.issues) {
          if (isRecord(issue) && typeof issue.message === "string" && issue.message) {
            const path = Array.isArray(issue.path)
              ? issue.path.map(String).join(".")
              : "";
            return path ? `${issue.message} (${path})` : issue.message;
          }
        }
      }
      if (typeof data.error === "string" && data.error !== "Validation") {
        return data.error;
      }
    }
    if (error.response?.status === 401) {
      return "Sessão expirada ou não autorizado.";
    }
    if (error.response?.status && error.response.status >= 500) {
      return "Erro no servidor. Tente novamente.";
    }
    if (error.code === "ERR_NETWORK") {
      return "Sem conexão com o servidor.";
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return null;
}

/** Prefixo amigável + detalhe da API (se houver). */
export function formatMutationError(prefix: string, error: unknown): string {
  const detail = getApiErrorDetail(error);
  return detail ? `${prefix}: ${detail}` : prefix;
}

function readTokenFromLocalStorage(): string | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      state?: { token?: string | null };
    };
    const token = parsed.state?.token;
    return typeof token === "string" ? token : null;
  } catch {
    return null;
  }
}

const api = axios.create({
  baseURL: "/api",
});

export default api;
export { api };

export type Pagination = {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
};

export function extractData<T = unknown>(res: { data: unknown }): T[] {
  const d = res.data;
  if (Array.isArray(d)) return d as T[];
  if (isRecord(d) && Array.isArray(d.data)) return d.data as T[];
  return [];
}

export function extractPaginated<T = unknown>(res: {
  data: unknown;
}): { data: T[]; pagination: Pagination | null } {
  const d = res.data;
  if (isRecord(d) && Array.isArray(d.data)) {
    return {
      data: d.data as T[],
      pagination: (d.pagination as Pagination | undefined) ?? null,
    };
  }
  if (Array.isArray(d)) return { data: d as T[], pagination: null };
  return { data: [], pagination: null };
}

api.interceptors.request.use((config) => {
  const token = readTokenFromLocalStorage();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      typeof window !== "undefined"
    ) {
      if (window.location.pathname !== "/login") {
        useAuthStore.getState().logout();
        window.location.assign("/login");
      }
    }
    return Promise.reject(error);
  },
);
