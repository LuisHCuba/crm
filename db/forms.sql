-- =====================================================================
-- MÓDULO DE FORMULÁRIOS (estilo Typebot)
-- =====================================================================
--
-- COMO APLICAR NO HASURA (pré-requisito para o módulo funcionar):
--
-- (a) Rodar este SQL:
--       Data > SQL > cole TODO o conteúdo deste arquivo > Run.
--       IMPORTANTE: NÃO marque "Track this". Esse atalho tenta trackear
--       TODOS os objetos novos, inclusive a função de trigger
--       `set_updated_at`, que NÃO pode ser trackeada (funções de trigger
--       não retornam tabela/composite) e faz o passo falhar com
--       "Tracking items failed / Inconsistent object: set_updated_at".
--     Em vez disso, faça o tracking das tabelas manualmente:
--       Data > default > public > seção "Untracked tables or views" >
--       clique em "Track" apenas em `forms` e `form_submissions`.
--       (A função `set_updated_at` deve permanecer SEM track.)
--     (Via psql: psql "$DATABASE_URL" -f crm/db/forms.sql e depois track
--      manual das duas tabelas como acima.)
--
-- (b) Garantir as RELATIONSHIPS no Hasura (Data > <tabela> >
--     Relationships). Normalmente o Hasura sugere automaticamente a
--     partir das foreign keys — basta clicar em "Add" / "Track All":
--       - form_submissions.form_id     -> forms        (object: "form")
--       - form_submissions.contact_id  -> contacts     (object: "contact")
--       - forms.submissions            (array, inverso de form_id)
--     As relationships não são obrigatórias para o front atual (ele só
--     insere/lê colunas diretas), mas são recomendadas.
--
-- (c) Permissions: o front usa admin-secret (header x-hasura-admin-secret),
--     então NÃO é necessário configurar permissions de role. Em produção,
--     troque por um backend com JWT.
-- =====================================================================

-- NOTA: NÃO usamos função/trigger para updated_at. O Hasura, ao marcar
-- "Track this" no Raw SQL, tenta trackear a função de trigger e falha
-- ("Inconsistent object: set_updated_at"). Para evitar essa dor, o
-- `updated_at` é mantido pela aplicação (o app envia updated_at no _set
-- ao salvar). Se você já criou a função/trigger antes, remova com:
--   DROP TRIGGER IF EXISTS forms_set_updated_at ON forms;
--   DROP FUNCTION IF EXISTS set_updated_at();

-- ---------------------------------------------------------------------
-- Tabela: forms
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS forms (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  status      text NOT NULL DEFAULT 'draft', -- draft | published
  definition  jsonb NOT NULL DEFAULT '{}'::jsonb,
  archived    boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Tabela: form_submissions
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS form_submissions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id     uuid NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  contact_id  uuid REFERENCES contacts(id) ON DELETE SET NULL,
  data        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS form_submissions_form_id_idx
  ON form_submissions (form_id);
CREATE INDEX IF NOT EXISTS form_submissions_contact_id_idx
  ON form_submissions (contact_id);
