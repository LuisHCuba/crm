# API LHCX CRM - Documentacao

**Base URL (producao):** `https://crm.lhcx.tech/api`

---

## Autenticacao

Todas as rotas (exceto login, register e health) exigem JWT no header:

```
Authorization: Bearer <token>
```

O token e obtido via `POST /auth/login`.

---

## Convencoes

- **Paginacao**: query params `page` (default 1) e `perPage` (default 25, max 100). Resposta: `{ data, pagination: { page, perPage, total, totalPages } }`.
- **Erros de validacao**: `400 { error: "Validation", issues: [...] }`.
- **Nao encontrado**: `404 { error: "NOT_FOUND", message: "..." }`.
- **Conflito**: `409 { error: "CONFLICT", message: "..." }`.
- **Nao autorizado**: `401 { error: "UNAUTHORIZED", message: "Token invalido ou ausente" }`.
- **Sem permissao**: `403 { error: "FORBIDDEN", message: "Acesso restrito a administradores" }`.
- **Soft delete**: registros sao arquivados (campo `archived`), nao excluidos fisicamente.

---

## Health Check

| Metodo | Rota | Auth |
|--------|------|------|
| GET | `/health` | Nao |

**Resposta:** `{ status: "ok", timestamp: "2026-04-13T00:00:00.000Z" }`

---

## Auth

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| POST | `/auth/register` | Nao | Registrar usuario |
| POST | `/auth/login` | Nao | Login |
| GET | `/auth/me` | JWT | Dados do usuario logado |
| GET | `/auth/users` | JWT | Listar usuarios |
| POST | `/auth/users` | JWT + admin | Criar usuario |
| PATCH | `/auth/users/:id` | JWT + admin | Editar usuario |
| DELETE | `/auth/users/:id` | JWT + admin | Arquivar usuario |
| PATCH | `/auth/users/:id/restore` | JWT + admin | Restaurar usuario |
| PATCH | `/auth/profile` | JWT | Atualizar perfil proprio |
| PATCH | `/auth/password` | JWT | Alterar senha |

### POST /auth/register

```json
{
  "name": "string (min 2)",
  "email": "string (email)",
  "password": "string (min 6)"
}
```

**Resposta 201:** `{ user: { id, name, email }, token }`

### POST /auth/login

```json
{
  "email": "string",
  "password": "string"
}
```

**Resposta 200:**

```json
{
  "user": {
    "id": "uuid",
    "name": "string",
    "email": "string",
    "avatarUrl": "string | null",
    "role": "admin | member",
    "themePreference": "light | dark | system",
    "sidebarCollapsed": false
  },
  "token": "jwt-token"
}
```

### PATCH /auth/profile

```json
{
  "name": "string (min 2, opcional)",
  "avatarUrl": "string url | null (opcional)",
  "themePreference": "light | dark | system (opcional)",
  "sidebarCollapsed": "boolean (opcional)"
}
```

### PATCH /auth/password

```json
{
  "currentPassword": "string",
  "newPassword": "string (min 6)"
}
```

### POST /auth/users (admin)

```json
{
  "name": "string (min 2)",
  "email": "string (email)",
  "password": "string (min 6)"
}
```

---

## Contatos

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| GET | `/contatos` | JWT | Listar contatos |
| GET | `/contatos/:id` | JWT | Detalhe do contato |
| POST | `/contatos` | JWT | Criar contato |
| PATCH | `/contatos/:id` | JWT | Atualizar contato |
| DELETE | `/contatos/:id` | JWT | Arquivar contato |
| PATCH | `/contatos/:id/restore` | JWT | Restaurar contato |
| POST | `/contatos/:id/empresas` | JWT | Vincular empresa |
| DELETE | `/contatos/:id/empresas/:companyId` | JWT | Desvincular empresa |
| GET | `/contatos/exportar` | JWT | Exportar XLSX |
| POST | `/contatos/importar` | JWT | Importar (multipart) |
| POST | `/contatos/importar/confirmar` | JWT | Confirmar importacao |

### POST /contatos

```json
{
  "fullName": "string (obrigatorio)",
  "email": "string email (obrigatorio)",
  "phone": "string | null (opcional)",
  "jobTitle": "string | null (opcional)",
  "origin": "website | referral | event | other (opcional)",
  "stage": "new | qualified | active_client | inactive (obrigatorio)",
  "responsibleId": "uuid | null (opcional)"
}
```

**Resposta 201:** registro completo do contato.

### PATCH /contatos/:id

Mesmos campos, todos opcionais (pelo menos um obrigatorio).

### GET /contatos (query params)

| Param | Tipo | Descricao |
|-------|------|-----------|
| page | number | Pagina |
| perPage | number | Itens por pagina (max 100) |
| stage | string | Filtrar por estagio |
| companyId | uuid | Filtrar por empresa |
| responsibleId | uuid | Filtrar por responsavel |
| search | string | Busca por nome ou email |

### POST /contatos/:id/empresas

```json
{ "companyId": "uuid" }
```

---

## Empresas

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| GET | `/empresas` | JWT | Listar empresas |
| GET | `/empresas/:id` | JWT | Detalhe da empresa |
| POST | `/empresas` | JWT | Criar empresa |
| PATCH | `/empresas/:id` | JWT | Atualizar empresa |
| DELETE | `/empresas/:id` | JWT | Arquivar empresa |
| PATCH | `/empresas/:id/restore` | JWT | Restaurar empresa |

### POST /empresas

```json
{
  "legalName": "string (obrigatorio)",
  "tradeName": "string | null (opcional)",
  "document": "string (obrigatorio, CNPJ/CPF)",
  "phone": "string | null (opcional)",
  "email": "string email | null (opcional)",
  "address": "string | null (opcional)",
  "type": "client | supplier | both (obrigatorio)",
  "responsibleId": "uuid | null (opcional)"
}
```

### GET /empresas (query params)

| Param | Tipo | Descricao |
|-------|------|-----------|
| page | number | Pagina |
| perPage | number | Itens por pagina |
| type | string | client, supplier ou both |
| responsibleId | uuid | Filtrar por responsavel |
| search | string | Busca por nome |

---

## Pipelines

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| GET | `/pipelines` | JWT | Listar pipelines |
| POST | `/pipelines` | JWT | Criar pipeline |
| GET | `/pipelines/:id` | JWT | Detalhe com estagios |
| PATCH | `/pipelines/:id` | JWT | Atualizar pipeline |
| DELETE | `/pipelines/:id` | JWT | Arquivar pipeline |
| PATCH | `/pipelines/:id/restore` | JWT | Restaurar pipeline |
| GET | `/pipelines/:id/stages` | JWT | Listar estagios |
| POST | `/pipelines/:id/stages` | JWT | Criar estagio |
| PATCH | `/pipelines/:id/stages/:stageId` | JWT | Editar estagio |
| DELETE | `/pipelines/:id/stages/:stageId` | JWT | Remover estagio |
| PATCH | `/pipelines/:id/stages/reorder` | JWT | Reordenar estagios |

### POST /pipelines

```json
{
  "name": "string (obrigatorio)",
  "active": "boolean (default true)"
}
```

### POST /pipelines/:id/stages

```json
{
  "name": "string (obrigatorio)",
  "order": "number inteiro",
  "type": "open | won | lost"
}
```

### PATCH /pipelines/:id/stages/reorder

```json
{
  "stages": [
    { "id": "uuid", "order": 1 },
    { "id": "uuid", "order": 2 }
  ]
}
```

---

## Negocios

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| GET | `/negocios` | JWT | Listar negocios |
| GET | `/negocios/:id` | JWT | Detalhe do negocio |
| POST | `/negocios` | JWT | Criar negocio |
| PATCH | `/negocios/:id` | JWT | Atualizar negocio |
| DELETE | `/negocios/:id` | JWT | Arquivar negocio |
| PATCH | `/negocios/:id/restore` | JWT | Restaurar negocio |
| GET | `/negocios/:id/itens` | JWT | Listar itens |
| POST | `/negocios/:id/itens` | JWT | Adicionar item |
| PATCH | `/negocios/:id/itens/:itemId` | JWT | Editar item |
| DELETE | `/negocios/:id/itens/:itemId` | JWT | Remover item |
| POST | `/negocios/:id/contatos` | JWT | Vincular contato |
| DELETE | `/negocios/:id/contatos/:contactId` | JWT | Desvincular contato |

### POST /negocios

```json
{
  "title": "string (obrigatorio)",
  "companyId": "uuid (opcional)",
  "pipelineId": "uuid (obrigatorio)",
  "stageId": "uuid (obrigatorio)",
  "responsibleId": "uuid (obrigatorio)",
  "forecastDate": "string YYYY-MM-DD | null (opcional)",
  "contactIds": ["uuid"] 
}
```

### PATCH /negocios/:id

```json
{
  "title": "string (opcional)",
  "companyId": "uuid | null (opcional)",
  "stageId": "uuid (opcional)",
  "responsibleId": "uuid (opcional)",
  "forecastDate": "string | null (opcional)",
  "lossReason": "price | competition | timing | no_response | other | null (opcional)"
}
```

### POST /negocios/:id/itens

```json
{
  "productId": "uuid",
  "quantity": "number (min 1)",
  "unitPrice": "string decimal",
  "discountPercent": "string decimal (default 0)"
}
```

### GET /negocios (query params)

| Param | Tipo | Descricao |
|-------|------|-----------|
| page | number | Pagina |
| perPage | number | Itens por pagina |
| pipelineId | uuid | Filtrar por pipeline |
| stageId | uuid | Filtrar por estagio |
| companyId | uuid | Filtrar por empresa |
| responsibleId | uuid | Filtrar por responsavel |
| contactId | uuid | Filtrar por contato |
| productId | uuid | Filtrar por produto |
| search | string | Busca por titulo |
| groupByStage | "true" | Agrupar por estagio (requer pipelineId) |

**Resposta com groupByStage=true:**

```json
{
  "stages": [
    { "id": "uuid", "name": "Novo", "type": "open", "order": 1, "deals": [...], "totalValue": "10000.00", "count": 5 }
  ]
}
```

---

## Produtos

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| GET | `/produtos` | JWT | Listar produtos |
| GET | `/produtos/:id` | JWT | Detalhe do produto |
| POST | `/produtos` | JWT | Criar produto |
| PATCH | `/produtos/:id` | JWT | Atualizar produto |
| DELETE | `/produtos/:id` | JWT | Arquivar produto |
| PATCH | `/produtos/:id/restore` | JWT | Restaurar produto |

### POST /produtos

```json
{
  "name": "string (obrigatorio)",
  "sku": "string (opcional)",
  "description": "string | null (opcional)",
  "basePrice": "string decimal ex: 199.90 (obrigatorio)",
  "unit": "string ex: un, kg, hr (obrigatorio)",
  "active": "boolean (default true)"
}
```

---

## Projetos

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| GET | `/projetos` | JWT | Listar projetos |
| POST | `/projetos` | JWT | Criar projeto |
| GET | `/projetos/:id` | JWT | Detalhe do projeto |
| PATCH | `/projetos/:id` | JWT | Atualizar projeto |
| DELETE | `/projetos/:id` | JWT | Arquivar projeto |
| PATCH | `/projetos/:id/restore` | JWT | Restaurar projeto |
| POST | `/projetos/:id/responsaveis` | JWT | Adicionar responsavel |
| DELETE | `/projetos/:id/responsaveis/:userId` | JWT | Remover responsavel |
| GET | `/projetos/:id/etapas` | JWT | Listar etapas |
| POST | `/projetos/:id/etapas` | JWT | Criar etapa |
| PATCH | `/projetos/:id/etapas/:stageId` | JWT | Editar etapa |
| DELETE | `/projetos/:id/etapas/:stageId` | JWT | Remover etapa |
| PUT | `/projetos/:id/etapas/reorder` | JWT | Reordenar etapas |

### POST /projetos

```json
{
  "title": "string (obrigatorio)",
  "description": "string | null (opcional)",
  "dealId": "uuid | null (opcional, vincular a negocio)",
  "plannedStartDate": "string YYYY-MM-DD | null (opcional)",
  "plannedEndDate": "string YYYY-MM-DD | null (opcional)",
  "responsibleIds": ["uuid (min 1 obrigatorio)"]
}
```

### POST /projetos/:id/etapas

```json
{
  "name": "string (obrigatorio)",
  "percentage": "number 0-100",
  "macroGroup": "not_started | in_progress | completed | paused | cancelled",
  "order": "number inteiro"
}
```

---

## Tarefas (de projetos)

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| GET | `/projetos/tarefas` | JWT | Listar todas as tarefas |
| GET | `/projetos/minhas-tarefas` | JWT | Minhas tarefas |
| GET | `/projetos/:projectId/tarefas` | JWT | Tarefas de um projeto |
| POST | `/projetos/:projectId/tarefas` | JWT | Criar tarefa |
| GET | `/projetos/:projectId/tarefas/:taskId` | JWT | Detalhe da tarefa |
| PATCH | `/projetos/:projectId/tarefas/:taskId` | JWT | Editar tarefa |
| DELETE | `/projetos/:projectId/tarefas/:taskId` | JWT | Arquivar tarefa |
| PATCH | `/projetos/:projectId/tarefas/:taskId/restore` | JWT | Restaurar tarefa |
| GET | `/projetos/:projectId/tarefas/:taskId/subtarefas` | JWT | Listar subtarefas |
| POST | `/projetos/:projectId/tarefas/:taskId/subtarefas` | JWT | Criar subtarefa |
| PATCH | `/projetos/:projectId/tarefas/:taskId/subtarefas/:subtaskId` | JWT | Editar subtarefa |
| DELETE | `/projetos/:projectId/tarefas/:taskId/subtarefas/:subtaskId` | JWT | Remover subtarefa |

### POST /projetos/:projectId/tarefas

```json
{
  "title": "string (obrigatorio)",
  "description": "string | null (opcional)",
  "responsibleId": "uuid | null (opcional)",
  "stageId": "uuid (obrigatorio, etapa do projeto)",
  "priority": "low | medium | high | null (opcional)",
  "plannedStartDate": "string YYYY-MM-DD | null (opcional)",
  "plannedEndDate": "string YYYY-MM-DD | null (opcional)",
  "dependsOnTaskId": "uuid | null (opcional)"
}
```

### POST /projetos/:projectId/tarefas/:taskId/subtarefas

```json
{
  "title": "string (obrigatorio)",
  "responsibleId": "uuid | null (opcional)",
  "stageId": "uuid (obrigatorio)"
}
```

---

## Atividades (Timeline)

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| POST | `/atividades` | JWT | Criar atividade |
| GET | `/atividades` | JWT | Listar atividades de um registro |
| GET | `/lembretes` | JWT | Listar lembretes |
| PATCH | `/lembretes/:id/concluir` | JWT | Concluir lembrete |

### POST /atividades

Atividades sao vinculadas a registros. **Pelo menos um** linkedId e obrigatorio.

**Nota:**

```json
{
  "type": "note",
  "title": "string (opcional)",
  "body": "string (opcional)",
  "linkedContactId": "uuid (pelo menos um vinculo obrigatorio)"
}
```

**Lembrete:**

```json
{
  "type": "reminder",
  "title": "string (opcional)",
  "body": "string (opcional)",
  "reminderDueDate": "string ISO datetime (obrigatorio)",
  "reminderResponsibleId": "uuid (opcional)",
  "linkedContactId": "uuid"
}
```

**Ligacao:**

```json
{
  "type": "call",
  "title": "string (opcional)",
  "body": "string (opcional)",
  "callDurationMinutes": "number (opcional)",
  "callResult": "answered | no_answer | voicemail (opcional)",
  "linkedContactId": "uuid"
}
```

**Reuniao:**

```json
{
  "type": "meeting",
  "title": "string (opcional)",
  "body": "string (opcional)",
  "meetingDate": "string ISO datetime (opcional)",
  "meetingParticipants": "string (opcional)",
  "linkedContactId": "uuid"
}
```

**Email:**

```json
{
  "type": "email",
  "title": "string (opcional)",
  "body": "string (opcional)",
  "emailSubject": "string (opcional)",
  "linkedContactId": "uuid"
}
```

**Vinculos possiveis (qualquer combinacao, pelo menos um):**

- `linkedCompanyId` - empresa
- `linkedContactId` - contato
- `linkedDealId` - negocio
- `linkedProjectId` - projeto
- `linkedTaskId` - tarefa

### GET /atividades (query params)

| Param | Tipo | Descricao |
|-------|------|-----------|
| linkedCompanyId | uuid | Atividades de uma empresa |
| linkedContactId | uuid | Atividades de um contato |
| linkedDealId | uuid | Atividades de um negocio |
| linkedProjectId | uuid | Atividades de um projeto |
| linkedTaskId | uuid | Atividades de uma tarefa |
| page | number | Pagina |
| perPage | number | Itens por pagina |

**Pelo menos um** linkedId e obrigatorio.

---

## Categorias Financeiras

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| GET | `/categorias-financeiras` | JWT | Listar categorias |
| GET | `/categorias-financeiras/:id` | JWT | Detalhe |
| POST | `/categorias-financeiras` | JWT | Criar categoria |
| PATCH | `/categorias-financeiras/:id` | JWT | Editar |
| DELETE | `/categorias-financeiras/:id` | JWT | Arquivar |
| PATCH | `/categorias-financeiras/:id/restore` | JWT | Restaurar |

### POST /categorias-financeiras

```json
{
  "name": "string (obrigatorio)",
  "type": "revenue | expense (obrigatorio)",
  "active": "boolean (default true)"
}
```

---

## Contas Bancarias

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| GET | `/contas-bancarias` | JWT | Listar com saldo |
| GET | `/contas-bancarias/:id` | JWT | Detalhe |
| POST | `/contas-bancarias` | JWT | Criar conta |
| PATCH | `/contas-bancarias/:id` | JWT | Editar |
| DELETE | `/contas-bancarias/:id` | JWT | Arquivar |
| PATCH | `/contas-bancarias/:id/restore` | JWT | Restaurar |
| GET | `/contas-bancarias/:id/extrato` | JWT | Extrato da conta |

### POST /contas-bancarias

```json
{
  "name": "string (obrigatorio)",
  "bankName": "string | null (opcional)",
  "branchAccount": "string | null (opcional)",
  "initialBalance": "string decimal (obrigatorio)",
  "active": "boolean (default true)"
}
```

### GET /contas-bancarias/:id/extrato (query params)

| Param | Tipo | Descricao |
|-------|------|-----------|
| page | number | Pagina |
| perPage | number | Itens por pagina |
| dateFrom | string | Data inicio YYYY-MM-DD |
| dateTo | string | Data fim YYYY-MM-DD |

---

## Contas a Receber

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| GET | `/contas-receber` | JWT | Listar |
| POST | `/contas-receber` | JWT | Criar |
| POST | `/contas-receber/gerar` | JWT | Gerar parcelas de negocio |
| GET | `/contas-receber/:id` | JWT | Detalhe |
| PATCH | `/contas-receber/:id` | JWT | Editar |
| DELETE | `/contas-receber/:id` | JWT | Arquivar |
| PATCH | `/contas-receber/:id/restore` | JWT | Restaurar |
| PATCH | `/contas-receber/:id/receber` | JWT | Dar baixa |
| PATCH | `/contas-receber/:id/cancelar` | JWT | Cancelar |

### POST /contas-receber

```json
{
  "description": "string (obrigatorio)",
  "companyId": "uuid (obrigatorio)",
  "productId": "uuid | null (opcional)",
  "value": "string decimal (obrigatorio)",
  "dueDate": "string YYYY-MM-DD (obrigatorio)",
  "categoryId": "uuid | null (opcional)",
  "bankAccountId": "uuid | null (opcional)",
  "recurrence": "none | monthly | bimonthly | quarterly | semiannual | annual (default none)",
  "recurrenceCount": "number min 2 (opcional, requer recurrence != none)"
}
```

### PATCH /contas-receber/:id/receber

```json
{
  "paymentDate": "string YYYY-MM-DD (obrigatorio)",
  "receivedValue": "string decimal (obrigatorio)",
  "bankAccountId": "uuid (obrigatorio)"
}
```

### GET /contas-receber (query params)

| Param | Tipo | Descricao |
|-------|------|-----------|
| page | number | Pagina |
| perPage | number | Itens por pagina |
| status | string | pending, paid, overdue, cancelled |
| companyId | uuid | Filtrar por empresa |
| categoryId | uuid | Filtrar por categoria |
| dealId | uuid | Filtrar por negocio |
| dueDateFrom | string | Vencimento a partir de |
| dueDateTo | string | Vencimento ate |

**Resposta:** `{ data, totals: { totalPending, totalOverdue, totalPaid }, pagination }`

---

## Contas a Pagar

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| GET | `/contas-pagar` | JWT | Listar |
| POST | `/contas-pagar` | JWT | Criar |
| GET | `/contas-pagar/:id` | JWT | Detalhe |
| PATCH | `/contas-pagar/:id` | JWT | Editar |
| DELETE | `/contas-pagar/:id` | JWT | Arquivar |
| PATCH | `/contas-pagar/:id/restore` | JWT | Restaurar |
| PATCH | `/contas-pagar/:id/pagar` | JWT | Dar baixa |
| PATCH | `/contas-pagar/:id/cancelar` | JWT | Cancelar |

### POST /contas-pagar

```json
{
  "description": "string (obrigatorio)",
  "companyId": "uuid | null (opcional)",
  "value": "string decimal (obrigatorio)",
  "dueDate": "string YYYY-MM-DD (obrigatorio)",
  "categoryId": "uuid | null (opcional)",
  "bankAccountId": "uuid | null (opcional)",
  "recurrence": "none | monthly | bimonthly | quarterly | semiannual | annual (default none)",
  "recurrenceCount": "number min 2 (opcional)"
}
```

### PATCH /contas-pagar/:id/pagar

```json
{
  "paymentDate": "string YYYY-MM-DD (obrigatorio)",
  "paidValue": "string decimal (obrigatorio)",
  "bankAccountId": "uuid (obrigatorio)"
}
```

---

## Busca Global

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| GET | `/busca?q=termo` | JWT | Busca em todos os modulos |

**Query:** `q` string (min 2 caracteres).

**Resposta 200:**

```json
{
  "companies": [{ "id": "uuid", "label": "string", "sublabel": "string" }],
  "contacts": [...],
  "deals": [...],
  "products": [...],
  "projects": [...],
  "tasks": [...],
  "receivables": [...],
  "payables": [...]
}
```

---

## Audit Log

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| GET | `/audit-log` | JWT | Historico de alteracoes |

### GET /audit-log (query params)

| Param | Tipo | Descricao |
|-------|------|-----------|
| page | number | Pagina |
| perPage | number | Itens por pagina |
| objectType | string | Tipo do registro (contact, company, deal...) |
| recordId | uuid | ID do registro especifico |
| userId | uuid | Filtrar por usuario |

**Resposta:** `{ data: [{ id, createdAt, userId, userName, objectType, recordId, action, field, oldValue, newValue }], pagination }`

---

## Exemplo: fluxo completo via n8n/site

### 1. Login

```
POST /api/auth/login
Body: { "email": "adm@lhcx.tech", "password": "suaSenha" }
```

Guarde o `token` da resposta.

### 2. Buscar contato existente

```
GET /api/contatos?search=email@cliente.com&perPage=1
Header: Authorization: Bearer <token>
```

### 3. Criar ou atualizar contato

Se nao existe:

```
POST /api/contatos
Body: { "fullName": "...", "email": "...", "phone": "...", "origin": "website", "stage": "new" }
```

Se ja existe (usar o `id` retornado na busca):

```
PATCH /api/contatos/<id>
Body: { "fullName": "...", "phone": "..." }
```

### 4. Criar nota na timeline

```
POST /api/atividades
Body: {
  "type": "note",
  "title": "Lead recebido via website",
  "body": "Detalhes do formulario...",
  "linkedContactId": "<id-do-contato>"
}
```
