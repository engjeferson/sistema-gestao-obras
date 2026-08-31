-- DropForeignKey
ALTER TABLE "RdoActivity" DROP CONSTRAINT "RdoActivity_planningTaskId_fkey";

-- AlterTable
ALTER TABLE "RdoActivity" ADD COLUMN     "planningStageId" TEXT,
ALTER COLUMN "planningTaskId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "RdoActivity" ADD CONSTRAINT "RdoActivity_planningTaskId_fkey" FOREIGN KEY ("planningTaskId") REFERENCES "PlanningTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RdoActivity" ADD CONSTRAINT "RdoActivity_planningStageId_fkey" FOREIGN KEY ("planningStageId") REFERENCES "PlanningStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
