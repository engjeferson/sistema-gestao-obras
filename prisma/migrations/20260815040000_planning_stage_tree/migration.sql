-- AlterTable
ALTER TABLE "PlanningStage" ADD COLUMN     "parentId" TEXT;

-- CreateIndex
CREATE INDEX "PlanningStage_parentId_idx" ON "PlanningStage"("parentId");

-- AddForeignKey
ALTER TABLE "PlanningStage" ADD CONSTRAINT "PlanningStage_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "PlanningStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

