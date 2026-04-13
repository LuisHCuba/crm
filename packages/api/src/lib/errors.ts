import { FastifyReply } from "fastify";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Registro não encontrado") {
    super(404, "NOT_FOUND", message);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Registro já existe") {
    super(409, "CONFLICT", message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Não autorizado") {
    super(401, "UNAUTHORIZED", message);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Dados inválidos") {
    super(400, "VALIDATION_ERROR", message);
  }
}

export function handleError(reply: FastifyReply, error: unknown) {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      error: error.code,
      message: error.message,
    });
  }
  console.error(error);
  return reply.status(500).send({ error: "INTERNAL", message: "Erro interno" });
}
