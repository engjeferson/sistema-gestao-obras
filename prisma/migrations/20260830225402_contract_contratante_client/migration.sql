-- AlterTable
ALTER TABLE "Contract" ADD COLUMN     "contratanteClientId" TEXT;

-- CreateIndex
CREATE INDEX "Contract_contratanteClientId_idx" ON "Contract"("contratanteClientId");

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_contratanteClientId_fkey" FOREIGN KEY ("contratanteClientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
