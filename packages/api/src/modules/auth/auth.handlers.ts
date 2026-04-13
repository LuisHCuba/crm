import { FastifyRequest, FastifyReply } from "fastify";
import { hash, compare } from "bcrypt";
import { eq } from "drizzle-orm";
import { db } from "../../db/connection";
import { users } from "../../db/schema";
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  type RegisterInput,
  type LoginInput,
  type UpdateProfileInput,
  type ChangePasswordInput,
} from "./auth.schemas";

const SALT_ROUNDS = 10;

export async function register(request: FastifyRequest, reply: FastifyReply) {
  const parsed = registerSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: "Validation", issues: parsed.error.issues });
  }

  const { name, email, password } = parsed.data;

  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (existing) {
    return reply.status(409).send({ error: "Conflict", message: "E-mail já cadastrado" });
  }

  const passwordHash = await hash(password, SALT_ROUNDS);

  const [user] = await db
    .insert(users)
    .values({ name, email, passwordHash })
    .returning({ id: users.id, name: users.name, email: users.email });

  const token = request.server.jwt.sign({ id: user.id, email: user.email, role: "member" });

  return reply.status(201).send({ user, token });
}

export async function login(request: FastifyRequest, reply: FastifyReply) {
  const parsed = loginSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: "Validation", issues: parsed.error.issues });
  }

  const { email, password } = parsed.data;

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (!user || !user.passwordHash) {
    return reply.status(401).send({ error: "Unauthorized", message: "E-mail ou senha inválidos" });
  }

  const valid = await compare(password, user.passwordHash);
  if (!valid) {
    return reply.status(401).send({ error: "Unauthorized", message: "E-mail ou senha inválidos" });
  }

  const token = request.server.jwt.sign({ id: user.id, email: user.email, role: user.role });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      role: user.role,
      themePreference: user.themePreference,
      sidebarCollapsed: user.sidebarCollapsed,
    },
    token,
  };
}

export async function me(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.user as { id: string; email: string };

  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
  });
  if (!user) {
    return reply.status(404).send({ error: "NotFound", message: "Usuário não encontrado" });
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    role: user.role,
    themePreference: user.themePreference,
    sidebarCollapsed: user.sidebarCollapsed,
  };
}

export async function updateProfile(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.user as { id: string };

  const parsed = updateProfileSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: "Validation", issues: parsed.error.issues });
  }

  const [updated] = await db
    .update(users)
    .set(parsed.data)
    .where(eq(users.id, id))
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
      themePreference: users.themePreference,
      sidebarCollapsed: users.sidebarCollapsed,
    });

  return updated;
}

export async function changePassword(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.user as { id: string };

  const parsed = changePasswordSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: "Validation", issues: parsed.error.issues });
  }

  const user = await db.query.users.findFirst({ where: eq(users.id, id) });
  if (!user || !user.passwordHash) {
    return reply.status(404).send({ error: "NotFound" });
  }

  const valid = await compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) {
    return reply.status(401).send({ error: "Unauthorized", message: "Senha atual incorreta" });
  }

  const newHash = await hash(parsed.data.newPassword, SALT_ROUNDS);
  await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, id));

  return { message: "Senha alterada com sucesso" };
}
