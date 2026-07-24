import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const n8nBase = env.VITE_N8N_BASE_URL || "https://n8n.lhcx.tech";

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        // bcryptjs faz require("crypto").randomBytes; no browser apontamos para
        // um shim mínimo (WebCrypto) para evitar o erro de externalização do
        // Vite sem puxar todo o crypto-browserify.
        crypto: fileURLToPath(
          new URL("./src/lib/crypto-shim.ts", import.meta.url)
        ),
      },
    },
    server: {
      port: 5173,
      proxy: {
        // Same-origin no dev: o browser chama /hasura e o Vite repassa para o
        // Hasura, eliminando o erro de CORS (Hasura não libera localhost).
        "/hasura": {
          target: "https://hasura.lhcx.tech",
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/hasura/, "/v1/graphql"),
        },
        // Same-origin para webhooks n8n (geração de formulários com IA).
        "/n8n": {
          target: n8nBase,
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/n8n/, ""),
        },
      },
    },
  };
});
