import nodemailer, { type Transporter } from "nodemailer";
import type { FastifyBaseLogger } from "fastify";

let transporter: Transporter | null = null;
let resolved = false;

function getTransporter(): Transporter | null {
  if (resolved) return transporter;
  resolved = true;

  const host = process.env.SMTP_HOST;
  if (!host) {
    transporter = null;
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  return transporter;
}

/**
 * Envia um e-mail transacional via SMTP. Se o SMTP não estiver configurado,
 * apenas registra um aviso e retorna false (não quebra o fluxo).
 */
export async function sendMail(
  opts: { to: string; subject: string; html: string; text?: string },
  logger?: FastifyBaseLogger
): Promise<boolean> {
  const t = getTransporter();
  if (!t) {
    logger?.warn("[mailer] SMTP não configurado; e-mail não enviado");
    return false;
  }

  const from =
    process.env.SMTP_FROM || process.env.SMTP_USER || "no-reply@lhcx.tech";

  try {
    await t.sendMail({ from, ...opts });
    return true;
  } catch (err) {
    logger?.error(err, "[mailer] falha ao enviar e-mail");
    return false;
  }
}
