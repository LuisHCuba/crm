import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { eq } from "drizzle-orm";
import { hash } from "bcrypt";
import { z } from "zod";
import { authenticate, requireAdmin } from "../../lib/authenticate";
import {
  login,
  me,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
} from "./auth.handlers";
import { db } from "../../db/connection";
import { users } from "../../db/schema";
import { logAudit, logChanges } from "../../lib/audit";
import { archiveRecord, restoreRecord } from "../../lib/soft-delete";

async function listUsers(_request: FastifyRequest, _reply: FastifyReply) {
  const result = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
      archived: users.archived,
      createdAt: users.createdAt,
    })
    .from(users);
  return result;
}

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
});

async function createUser(request: FastifyRequest, reply: FastifyReply) {
  const parsed = createUserSchema.safeParse(request.body);
  if (!parsed.success) return reply.status(400).send({ error: "Validation", issues: parsed.error.issues });

  const existing = await db.query.users.findFirst({ where: eq(users.email, parsed.data.email) });
  if (existing) return reply.status(409).send({ error: "Conflict", message: "E-mail já cadastrado" });

  const passwordHash = await hash(parsed.data.password, 10);
  const [user] = await db.insert(users).values({
    name: parsed.data.name,
    email: parsed.data.email,
    passwordHash,
  }).returning({ id: users.id, name: users.name, email: users.email });

  const adminId = (request.user as any).id;
  await logAudit({ userId: adminId, objectType: "user", recordId: user.id, action: "created" });

  return reply.status(201).send(user);
}

async function updateUser(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const adminId = (request.user as { id: string }).id;
  const parsed = updateUserSchema.safeParse(request.body);
  if (!parsed.success) return reply.status(400).send({ error: "Validation", issues: parsed.error.issues });

  const existing = await db.query.users.findFirst({ where: eq(users.id, id) });
  if (!existing) return reply.status(404).send({ error: "NOT_FOUND", message: "Usuário não encontrado" });

  const updates: Record<string, unknown> = {};
  if (parsed.data.name) updates.name = parsed.data.name;
  if (parsed.data.email) updates.email = parsed.data.email;
  if (parsed.data.password) updates.passwordHash = await hash(parsed.data.password, 10);

  if (Object.keys(updates).length === 0) return reply.status(400).send({ error: "VALIDATION_ERROR", message: "Nenhum campo para atualizar" });

  const oldData: Record<string, unknown> = { name: existing.name, email: existing.email };

  const [updated] = await db.update(users).set(updates).where(eq(users.id, id)).returning({
    id: users.id, name: users.name, email: users.email,
  });

  const newData: Record<string, unknown> = {};
  if (updates.name) newData.name = updated.name;
  if (updates.email) newData.email = updated.email;

  await logChanges({ userId: adminId, objectType: "user", recordId: id, oldData, newData });

  return updated;
}

async function archiveUser(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const adminId = (request.user as any).id;
  await archiveRecord(users, id, adminId, "user");
  return reply.status(204).send();
}

async function restoreUser(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const adminId = (request.user as any).id;
  await restoreRecord(users, id, adminId, "user");
  return { ok: true };
}

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/login", login);
  app.post("/auth/forgot-password", forgotPassword);
  app.post("/auth/reset-password", resetPassword);

  app.get("/auth/me", { preHandler: [authenticate] }, me);
  app.get("/auth/users", { preHandler: [authenticate] }, listUsers);
  app.post("/auth/users", { preHandler: [authenticate, requireAdmin] }, createUser);
  app.patch("/auth/users/:id", { preHandler: [authenticate, requireAdmin] }, updateUser);
  app.delete("/auth/users/:id", { preHandler: [authenticate, requireAdmin] }, archiveUser);
  app.patch("/auth/users/:id/restore", { preHandler: [authenticate, requireAdmin] }, restoreUser);
  app.patch("/auth/profile", { preHandler: [authenticate] }, updateProfile);
  app.patch("/auth/password", { preHandler: [authenticate] }, changePassword);
}
