ALTER TABLE "deals" ALTER COLUMN "company_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "deal_contacts" ADD CONSTRAINT "deal_contacts_pk" PRIMARY KEY ("deal_id", "contact_id");
