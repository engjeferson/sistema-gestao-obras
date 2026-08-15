-- AlterTable
ALTER TABLE "Work" ADD COLUMN     "portalToken" TEXT;

-- Backfill: token unico e nao sequencial para as obras ja existentes.
UPDATE "Work" SET "portalToken" = md5(random()::text || clock_timestamp()::text) WHERE "portalToken" IS NULL;

-- AlterTable
ALTER TABLE "Work" ALTER COLUMN "portalToken" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Work_portalToken_key" ON "Work"("portalToken");
