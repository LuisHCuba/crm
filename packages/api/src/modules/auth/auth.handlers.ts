import { FastifyRequest, FastifyReply } from "fastify";
import { hash, compare } from "bcrypt";
import { and, eq, gt } from "drizzle-orm";
import { randomBytes, createHash } from "node:crypto";
import { db } from "../../db/connection";
import { users } from "../../db/schema";
import { sendMail } from "../../lib/mailer";
import {
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  type LoginInput,
  type UpdateProfileInput,
  type ChangePasswordInput,
} from "./auth.schemas";

const SALT_ROUNDS = 10;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
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

export async function forgotPassword(request: FastifyRequest, reply: FastifyReply) {
  const parsed = forgotPasswordSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: "Validation", issues: parsed.error.issues });
  }

  const { email } = parsed.data;
  const genericMessage =
    "Se o e-mail existir, enviaremos um link de redefinição em instantes.";

  const user = await db.query.users.findFirst({ where: eq(users.email, email) });

  // Não revela se o e-mail existe (evita enumeração de usuários).
  if (!user || user.archived) {
    return reply.send({ message: genericMessage });
  }

  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await db
    .update(users)
    .set({ passwordResetToken: hashToken(token), passwordResetExpires: expires })
    .where(eq(users.id, user.id));

  const appUrl =
    process.env.APP_URL || process.env.CORS_ORIGIN?.split(",")[0]?.trim() || "";
  const link = `${appUrl}/redefinir-senha?token=${token}`;

  await sendMail(
    {
      to: email,
      subject: "Redefinição de senha — LHCX CRM",
      text: `Você solicitou a redefinição de senha. Acesse o link a seguir (válido por 1 hora): ${link}\n\nSe não foi você, ignore este e-mail.`,
      html: `<p>Você solicitou a redefinição de senha do <strong>LHCX CRM</strong>.</p>
<p><a href="${link}">Clique aqui para redefinir sua senha</a> (válido por 1 hora).</p>
<p>Se não foi você, ignore este e-mail.</p>`,
    },
    request.log
  );

  return reply.send({ message: genericMessage });
}

export async function resetPassword(request: FastifyRequest, reply: FastifyReply) {
  const parsed = resetPasswordSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: "Validation", issues: parsed.error.issues });
  }

  const { token, newPassword } = parsed.data;

  const user = await db.query.users.findFirst({
    where: and(
      eq(users.passwordResetToken, hashToken(token)),
      gt(users.passwordResetExpires, new Date())
    ),
  });

  if (!user) {
    return reply
      .status(400)
      .send({ error: "INVALID_TOKEN", message: "Token inválido ou expirado" });
  }

  const newHash = await hash(newPassword, SALT_ROUNDS);
  await db
    .update(users)
    .set({
      passwordHash: newHash,
      passwordResetToken: null,
      passwordResetExpires: null,
    })
    .where(eq(users.id, user.id));

  return reply.send({ message: "Senha redefinida com sucesso" });
}
