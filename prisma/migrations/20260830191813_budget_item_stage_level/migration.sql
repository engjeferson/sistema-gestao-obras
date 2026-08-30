-- AlterTable
ALTER TABLE "BudgetItem" ADD COLUMN     "stageId" TEXT,
ALTER COLUMN "taskId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "BudgetItem_stageId_idx" ON "BudgetItem"("stageId");

-- AddForeignKey
ALTER TABLE "BudgetItem" ADD CONSTRAINT "BudgetItem_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "PlanningStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
