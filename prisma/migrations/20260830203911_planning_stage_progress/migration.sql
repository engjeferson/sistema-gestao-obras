-- AlterTable
ALTER TABLE "PlanningStage" ADD COLUMN     "percentualExecutado" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "status" "PlanningStatus" NOT NULL DEFAULT 'NAO_INICIADA';
