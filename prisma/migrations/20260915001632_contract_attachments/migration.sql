CREATE TABLE "ContractAttachment" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContractAttachment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ContractAttachment_contractId_idx" ON "ContractAttachment"("contractId");
ALTER TABLE "ContractAttachment" ADD CONSTRAINT "ContractAttachment_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "ContractAttachment" ("id", "contractId", "url", "nome", "createdAt")
SELECT gen_random_uuid()::text, "id", "arquivoUrl", split_part("arquivoUrl", '/', -1), "createdAt"
FROM "Contract"
WHERE "arquivoUrl" IS NOT NULL;

ALTER TABLE "Contract" DROP COLUMN "arquivoUrl";
