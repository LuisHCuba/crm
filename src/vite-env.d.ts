/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_HASURA_ENDPOINT: string;
  readonly VITE_HASURA_ADMIN_SECRET: string;
  readonly VITE_N8N_FORM_WEBHOOK_URL?: string;
  readonly VITE_N8N_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
