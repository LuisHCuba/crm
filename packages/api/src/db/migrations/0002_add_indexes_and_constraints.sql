-- Indexes for archived column (used in almost every list query)
CREATE INDEX IF NOT EXISTS idx_contacts_archived ON contacts (archived);
CREATE INDEX IF NOT EXISTS idx_companies_archived ON companies (archived);
CREATE INDEX IF NOT EXISTS idx_deals_archived ON deals (archived);
CREATE INDEX IF NOT EXISTS idx_products_archived ON products (archived);
CREATE INDEX IF NOT EXISTS idx_projects_archived ON projects (archived);
CREATE INDEX IF NOT EXISTS idx_project_tasks_archived ON project_tasks (archived);
CREATE INDEX IF NOT EXISTS idx_project_subtasks_archived ON project_subtasks (archived);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_archived ON bank_accounts (archived);
CREATE INDEX IF NOT EXISTS idx_receivables_archived ON receivables (archived);
CREATE INDEX IF NOT EXISTS idx_payables_archived ON payables (archived);
CREATE INDEX IF NOT EXISTS idx_financial_categories_archived ON financial_categories (archived);

-- Foreign key indexes for join tables
CREATE INDEX IF NOT EXISTS idx_contact_companies_contact_id ON contact_companies (contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_companies_company_id ON contact_companies (company_id);
CREATE INDEX IF NOT EXISTS idx_deal_contacts_deal_id ON deal_contacts (deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_contacts_contact_id ON deal_contacts (contact_id);
CREATE INDEX IF NOT EXISTS idx_deal_line_items_deal_id ON deal_line_items (deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_line_items_product_id ON deal_line_items (product_id);
CREATE INDEX IF NOT EXISTS idx_project_responsibles_project_id ON project_responsibles (project_id);
CREATE INDEX IF NOT EXISTS idx_project_responsibles_user_id ON project_responsibles (user_id);

-- Indexes for frequently filtered columns
CREATE INDEX IF NOT EXISTS idx_deals_pipeline_id ON deals (pipeline_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage_id ON deals (stage_id);
CREATE INDEX IF NOT EXISTS idx_deals_responsible_id ON deals (responsible_id);
CREATE INDEX IF NOT EXISTS idx_deals_company_id ON deals (company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_stage ON contacts (stage);
CREATE INDEX IF NOT EXISTS idx_contacts_responsible_id ON contacts (responsible_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_project_id ON project_tasks (project_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_stage_id ON project_tasks (stage_id);
CREATE INDEX IF NOT EXISTS idx_project_subtasks_task_id ON project_subtasks (task_id);
CREATE INDEX IF NOT EXISTS idx_project_subtasks_stage_id ON project_subtasks (stage_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_pipeline_id ON pipeline_stages (pipeline_id);
CREATE INDEX IF NOT EXISTS idx_receivables_bank_account_id ON receivables (bank_account_id);
CREATE INDEX IF NOT EXISTS idx_receivables_deal_id ON receivables (deal_id);
CREATE INDEX IF NOT EXISTS idx_payables_bank_account_id ON payables (bank_account_id);
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities (type);
CREATE INDEX IF NOT EXISTS idx_activities_linked_deal_id ON activities (linked_deal_id);
CREATE INDEX IF NOT EXISTS idx_activities_linked_project_id ON activities (linked_project_id);
CREATE INDEX IF NOT EXISTS idx_activities_linked_contact_id ON activities (linked_contact_id);
CREATE INDEX IF NOT EXISTS idx_activities_linked_company_id ON activities (linked_company_id);
CREATE INDEX IF NOT EXISTS idx_activities_reminder_responsible_id ON activities (reminder_responsible_id);

-- Composite unique constraint for contact_companies (prevent duplicates)
CREATE UNIQUE INDEX IF NOT EXISTS idx_contact_companies_unique ON contact_companies (contact_id, company_id);

-- Composite unique constraint for deal_contacts (prevent duplicates)
CREATE UNIQUE INDEX IF NOT EXISTS idx_deal_contacts_unique ON deal_contacts (deal_id, contact_id);

-- User role column
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'member');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role user_role NOT NULL DEFAULT 'member';

-- Search indexes (for text search)
CREATE INDEX IF NOT EXISTS idx_contacts_full_name ON contacts (full_name);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts (email);
CREATE INDEX IF NOT EXISTS idx_deals_title ON deals (title);
