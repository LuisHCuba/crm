import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import { authRoutes } from "./modules/auth/auth.routes";
import { pipelineRoutes } from "./modules/pipeline/pipeline.routes";
import { empresaRoutes } from "./modules/empresa/empresa.routes";
import { contatoRoutes } from "./modules/contato/contato.routes";
import { produtoRoutes } from "./modules/produto/produto.routes";
import { negocioRoutes } from "./modules/negocio/negocio.routes";
import { tarefaRoutes } from "./modules/tarefa/tarefa.routes";
import { projetoRoutes } from "./modules/projeto/projeto.routes";
import { categoriaFinanceiraRoutes } from "./modules/categoria-financeira/categoria-financeira.routes";
import { contaBancariaRoutes } from "./modules/conta-bancaria/conta-bancaria.routes";
import { contaReceberRoutes } from "./modules/conta-receber/conta-receber.routes";
import { contaPagarRoutes } from "./modules/conta-pagar/conta-pagar.routes";
import { atividadeRoutes } from "./modules/atividade/atividade.routes";
import { auditRoutes } from "./modules/audit/audit.routes";
import { buscaRoutes } from "./modules/busca/busca.routes";

if (!process.env.JWT_SECRET || process.env.JWT_SECRET === "trocar-em-producao") {
  if (process.env.NODE_ENV === "production") {
    console.error("FATAL: JWT_SECRET não configurado ou usando valor padrão em produção");
    process.exit(1);
  }
  console.warn("AVISO: JWT_SECRET não configurado. Usando valor padrão apenas para desenvolvimento.");
}

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
  : undefined;

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: allowedOrigins ?? (process.env.NODE_ENV === "production" ? false : true),
});
await app.register(jwt, { secret: process.env.JWT_SECRET ?? "dev-only-secret" });
await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { id: string; email: string; role: string };
    user: { id: string; email: string; role: string };
  }
}

app.get("/health", async () => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

await app.register(authRoutes);
await app.register(pipelineRoutes);
await app.register(empresaRoutes);
await app.register(contatoRoutes);
await app.register(produtoRoutes);
await app.register(negocioRoutes);
await app.register(tarefaRoutes);
await app.register(projetoRoutes);
await app.register(atividadeRoutes);
await app.register(auditRoutes);
await app.register(buscaRoutes);
await app.register(categoriaFinanceiraRoutes);
await app.register(contaBancariaRoutes);
await app.register(contaReceberRoutes);
await app.register(contaPagarRoutes);

const start = async () => {
  try {
    await app.listen({ port: 3000, host: "0.0.0.0" });
    app.log.info("API running on http://0.0.0.0:3000");
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
