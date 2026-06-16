import { GraphQLClient } from "graphql-request";

const adminSecret = import.meta.env.VITE_HASURA_ADMIN_SECRET;

if (!adminSecret) {
  throw new Error(
    "Falta a variável de ambiente VITE_HASURA_ADMIN_SECRET (verifique o .env.local)."
  );
}

// No browser usamos o proxy same-origin do Vite (/hasura -> /v1/graphql) para
// evitar CORS. O graphql-request faz new URL(endpoint), então precisa ser uma
// URL absoluta — montamos a partir da origem atual. Em produção, isto deve
// passar por um backend com JWT em vez do admin-secret no cliente.
const endpoint =
  typeof window !== "undefined"
    ? `${window.location.origin}/hasura`
    : "http://localhost:5173/hasura";

// AVISO: o admin-secret está exposto no browser. Aceitável apenas em DEV.
export const gqlClient = new GraphQLClient(endpoint, {
  headers: {
    "x-hasura-admin-secret": adminSecret,
  },
});
