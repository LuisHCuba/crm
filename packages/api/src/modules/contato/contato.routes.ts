import { FastifyInstance } from "fastify";
import { authenticate } from "../../lib/authenticate";
import {
  list,
  getById,
  create,
  update,
  archive,
  restore,
  linkCompany,
  unlinkCompany,
  exportContatos,
  importPreview,
  importConfirm,
} from "./contato.handlers";

export async function contatoRoutes(app: FastifyInstance) {
  const auth = { preHandler: [authenticate] };

  app.get("/contatos", { ...auth }, list);
  app.get("/contatos/exportar", { ...auth }, exportContatos);
  app.post("/contatos/importar", { ...auth }, importPreview);
  app.post("/contatos/importar/confirmar", { ...auth }, importConfirm);
  app.get("/contatos/:id", { ...auth }, getById);
  app.post("/contatos", { ...auth }, create);
  app.patch("/contatos/:id", { ...auth }, update);
  app.delete("/contatos/:id", { ...auth }, archive);
  app.patch("/contatos/:id/restore", { ...auth }, restore);
  app.post("/contatos/:id/empresas", { ...auth }, linkCompany);
  app.delete("/contatos/:id/empresas/:companyId", { ...auth }, unlinkCompany);
}
