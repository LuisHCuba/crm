# CRM — Geração de formulários com IA (n8n)

Workflow com **AI Agent** (LangChain) + **Google Gemini Chat Model**.

## Fluxo

```
Webhook → Montar prompts → AI Agent (+ Gemini) → Normalizar JSON → Respond
```

## Nodes

| Node | Função |
|------|--------|
| **Webhook** | `POST /webhook/crm-form-ai` |
| **Montar prompts** | Extrai `prompt` do body e monta system/user message |
| **AI Agent** | Node LangChain v3.1 — gera o JSON do formulário |
| **Google Gemini Chat Model** | Modelo conectado ao AI Agent (credencial `GEMINI LUIHSCUBA`) |
| **Normalizar JSON** | Valida, injeta UUIDs, padroniza resposta |
| **Respond to Webhook** | Devolve `{ title, definition }` ao CRM |

## Configuração do AI Agent

Parâmetros já definidos no JSON:

- **Prompt Type:** Define below
- **Prompt (User Message):** `={{ $json.userPrompt }}`
- **System Message:** `={{ $json.systemPrompt }}`

O **Google Gemini Chat Model** deve estar conectado na entrada **Chat Model** do AI Agent.

## Importar no n8n

1. Abra o n8n (`https://flux.lhcx.tech`).
2. **Workflows → Import from File** → `form-ai-generator.json`.
3. Confirme que a credencial **GEMINI LUIHSCUBA** está ligada ao node Gemini.
4. Ative o workflow.

## Variáveis no CRM (`.env.local`)

```env
VITE_N8N_BASE_URL=https://flux.lhcx.tech
VITE_N8N_FORM_WEBHOOK_URL=/webhook/crm-form-ai
```

## Teste

```bash
curl -X POST "https://flux.lhcx.tech/webhook/crm-form-ai" \
  -H "Content-Type: application/json" \
  -d "{\"prompt\":\"Formulário de contato com nome, email e mensagem\"}"
```

Via proxy local:

```bash
curl -X POST "http://localhost:5173/n8n/webhook/crm-form-ai" \
  -H "Content-Type: application/json" \
  -d "{\"prompt\":\"Formulário de contato com nome, email e mensagem\"}"
```

## Fallback (opcional)

No **AI Agent**, ative **Needs Fallback Model** e conecte um segundo Chat Model (ex.: OpenAI) na entrada de fallback. O n8n tenta o Gemini primeiro e usa o segundo se falhar.

## Troubleshooting

| Problema | Solução |
|----------|---------|
| `No prompt specified` | Confirme `promptType: define` e `text: ={{ $json.userPrompt }}` |
| Só 10 perguntas / formulário incompleto | Gemini usa **2048 tokens** por padrão — configure **8192** no node Gemini; system prompt exige TODAS as perguntas numeradas |
| HTTP 404 | Workflow inativo |
| Credencial Gemini | Reconecte **GEMINI LUIHSCUBA** no node Gemini |
