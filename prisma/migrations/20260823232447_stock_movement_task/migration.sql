-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN     "taskId" TEXT;

-- CreateIndex
CREATE INDEX "StockMovement_taskId_idx" ON "StockMovement"("taskId");

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "PlanningTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;
