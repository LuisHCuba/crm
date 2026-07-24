-- =====================================================================
-- VÍNCULO NEGÓCIO <-> PROPOSTA
-- =====================================================================
-- Aplicado em produção em 2026-07-24 via API do Hasura (run_sql).
-- Mantido aqui como registro/reprodução em outros ambientes.
--
-- (a) SQL (Data > SQL no console do Hasura — NÃO marque "Track this"):
ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS deal_id uuid REFERENCES deals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS proposals_deal_id_idx ON proposals (deal_id);

-- (b) Relationships no Hasura (Data > proposals/deals > Relationships):
--   - proposals.deal   (object, via FK deal_id -> deals.id)
--   - deals.proposals  (array,  inverso da mesma FK)
--
-- Equivalente via API de metadata:
--   pg_create_object_relationship { table: proposals, name: deal,
--     using: { foreign_key_constraint_on: deal_id } }
--   pg_create_array_relationship  { table: deals, name: proposals,
--     using: { foreign_key_constraint_on: { table: proposals, column: deal_id } } }
