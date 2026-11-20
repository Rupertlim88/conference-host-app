ALTER TABLE "sign_in"."account" ADD COLUMN "issuer" text;--> statement-breakpoint
UPDATE "sign_in"."account" SET "issuer" = 'https://accounts.google.com' WHERE "provider_id" = 'google';--> statement-breakpoint
ALTER TABLE "sign_in"."account" ALTER COLUMN "issuer" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "account_issuer_accountId_uidx" ON "sign_in"."account" USING btree ("issuer","account_id");
