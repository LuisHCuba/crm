import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // bcryptjs faz require("crypto").randomBytes; no browser apontamos para
      // um shim mínimo (WebCrypto) para evitar o erro de externalização do
      // Vite sem puxar todo o crypto-browserify.
      crypto: fileURLToPath(new URL("./src/lib/crypto-shim.ts", import.meta.url)),
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
    },
  },
});
