-- AlterTable
ALTER TABLE "Contract" ADD COLUMN     "contratadoSupplierId" TEXT;

-- CreateIndex
CREATE INDEX "Contract_contratadoSupplierId_idx" ON "Contract"("contratadoSupplierId");

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_contratadoSupplierId_fkey" FOREIGN KEY ("contratadoSupplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
