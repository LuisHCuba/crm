import type { FastifyBaseLogger } from "fastify";

/**
 * Dispara um webhook para o n8n (ou qualquer endpoint em N8N_WEBHOOK_URL).
 * Fire-and-forget: nunca lança nem bloqueia a resposta da API. Se a URL não
 * estiver configurada, é um no-op silencioso.
 *
 * Eventos atuais: "contato.created", "negocio.won", "recebimento.pago".
 */
export function dispatchWebhook(
  event: string,
  data: unknown,
  logger?: FastifyBaseLogger
): void {
  const url = process.env.N8N_WEBHOOK_URL;
  if (!url) return;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (process.env.N8N_WEBHOOK_SECRET) {
    headers["X-Webhook-Secret"] = process.env.N8N_WEBHOOK_SECRET;
  }

  const body = JSON.stringify({
    event,
    data,
    timestamp: new Date().toISOString(),
  });

  fetch(url, { method: "POST", headers, body })
    .then((res) => {
      if (!res.ok) {
        logger?.warn(`[webhook] ${event} respondeu status ${res.status}`);
      }
    })
    .catch((err) => logger?.error(err, `[webhook] ${event} falhou`));
}
