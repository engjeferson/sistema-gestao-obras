-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN     "transferGrupoId" TEXT,
ADD COLUMN     "valorUnitario" DECIMAL(14,2);

-- CreateIndex
CREATE INDEX "StockMovement_transferGrupoId_idx" ON "StockMovement"("transferGrupoId");

