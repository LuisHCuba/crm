# LHCX - CRM

Sistema de CRM com gestão de contatos, empresas, negócios, projetos e financeiro.

## Estrutura

```
packages/
  api/    # Backend - Fastify + Drizzle + PostgreSQL
  web/    # Frontend - React + Vite + TanStack Query
```

## Desenvolvimento

### Pré-requisitos

- Node.js 20+
- PostgreSQL 16+

### Setup

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp packages/api/.env.example packages/api/.env

# Rodar migrações
npm run db:migrate --workspace=packages/api

# Iniciar em desenvolvimento
npm run dev
```

### Docker

```bash
# Desenvolvimento (apenas PostgreSQL)
docker compose -f docker-compose.dev.yml up -d

# Produção
docker compose up -d
```

## Convenções

- **Commits**: Seguir [Conventional Commits](https://www.conventionalcommits.org/pt-br/)
- **Versionamento**: [Semantic Versioning 2.0.0](https://semver.org/lang/pt-BR/)
