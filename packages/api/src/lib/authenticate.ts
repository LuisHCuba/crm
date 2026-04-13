import { FastifyRequest, FastifyReply } from "fastify";

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({ error: "UNAUTHORIZED", message: "Token inválido ou ausente" });
  }
}

export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = request.user as { id: string; email: string; role?: string };
  if (user.role !== "admin") {
    return reply.status(403).send({ error: "FORBIDDEN", message: "Acesso restrito a administradores" });
  }
}
