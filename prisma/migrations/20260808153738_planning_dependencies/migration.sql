-- CreateTable
CREATE TABLE "PlanningDependency" (
    "id" TEXT NOT NULL,
    "predecessorTaskId" TEXT NOT NULL,
    "successorTaskId" TEXT NOT NULL,
    "lagDias" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanningDependency_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlanningDependency_successorTaskId_idx" ON "PlanningDependency"("successorTaskId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanningDependency_predecessorTaskId_successorTaskId_key" ON "PlanningDependency"("predecessorTaskId", "successorTaskId");

-- AddForeignKey
ALTER TABLE "PlanningDependency" ADD CONSTRAINT "PlanningDependency_predecessorTaskId_fkey" FOREIGN KEY ("predecessorTaskId") REFERENCES "PlanningTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningDependency" ADD CONSTRAINT "PlanningDependency_successorTaskId_fkey" FOREIGN KEY ("successorTaskId") REFERENCES "PlanningTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

