-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN     "stageId" TEXT;

-- CreateIndex
CREATE INDEX "StockMovement_stageId_idx" ON "StockMovement"("stageId");

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "PlanningStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

