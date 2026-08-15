-- CreateTable
CREATE TABLE "PlanningTemplate" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanningTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanningTemplateStage" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "codigo" TEXT,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlanningTemplateStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanningTemplateTask" (
    "id" TEXT NOT NULL,
    "templateStageId" TEXT NOT NULL,
    "codigo" TEXT,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "offsetInicioDias" INTEGER NOT NULL,
    "duracaoDias" INTEGER NOT NULL,

    CONSTRAINT "PlanningTemplateTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanningTemplateDependency" (
    "id" TEXT NOT NULL,
    "predecessorTaskId" TEXT NOT NULL,
    "successorTaskId" TEXT NOT NULL,
    "lagDias" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlanningTemplateDependency_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlanningTemplateStage_templateId_idx" ON "PlanningTemplateStage"("templateId");

-- CreateIndex
CREATE INDEX "PlanningTemplateTask_templateStageId_idx" ON "PlanningTemplateTask"("templateStageId");

-- CreateIndex
CREATE INDEX "PlanningTemplateDependency_successorTaskId_idx" ON "PlanningTemplateDependency"("successorTaskId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanningTemplateDependency_predecessorTaskId_successorTaskI_key" ON "PlanningTemplateDependency"("predecessorTaskId", "successorTaskId");

-- AddForeignKey
ALTER TABLE "PlanningTemplate" ADD CONSTRAINT "PlanningTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningTemplateStage" ADD CONSTRAINT "PlanningTemplateStage_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PlanningTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningTemplateTask" ADD CONSTRAINT "PlanningTemplateTask_templateStageId_fkey" FOREIGN KEY ("templateStageId") REFERENCES "PlanningTemplateStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningTemplateDependency" ADD CONSTRAINT "PlanningTemplateDependency_predecessorTaskId_fkey" FOREIGN KEY ("predecessorTaskId") REFERENCES "PlanningTemplateTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningTemplateDependency" ADD CONSTRAINT "PlanningTemplateDependency_successorTaskId_fkey" FOREIGN KEY ("successorTaskId") REFERENCES "PlanningTemplateTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

