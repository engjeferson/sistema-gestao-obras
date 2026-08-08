-- CreateEnum
CREATE TYPE "CostType" AS ENUM ('MATERIAL', 'MAO_DE_OBRA', 'SERVICO_TERCEIRIZADO', 'EQUIPAMENTO', 'TRANSPORTE', 'OUTROS');

-- CreateEnum
CREATE TYPE "SupplierCategory" AS ENUM ('MATERIAIS', 'CONCRETO', 'ACO', 'MADEIRA', 'ELETRICA', 'HIDRAULICA', 'ESQUADRIAS', 'PINTURA', 'SERVICOS', 'LOCACAO', 'TRANSPORTE', 'OUTROS');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'FINANCEIRO';

-- AlterTable
ALTER TABLE "FinancialTransaction" ADD COLUMN     "stageId" TEXT,
ADD COLUMN     "taskId" TEXT;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "stageId" TEXT,
ADD COLUMN     "taskId" TEXT;

-- AlterTable
ALTER TABLE "PlanningStage" ADD COLUMN     "codigo" TEXT;

-- AlterTable
ALTER TABLE "PlanningTask" ADD COLUMN     "codigo" TEXT;

-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN     "categoria" "SupplierCategory",
ADD COLUMN     "nomeFantasia" TEXT,
ADD COLUMN     "whatsapp" TEXT;

-- CreateTable
CREATE TABLE "BudgetItem" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "codigo" TEXT,
    "descricao" TEXT,
    "tipoCusto" "CostType" NOT NULL,
    "unidade" "UnitOfMeasure",
    "quantidadePrevista" DECIMAL(12,3),
    "valorUnitarioPrevisto" DECIMAL(14,2),
    "valorTotalPrevisto" DECIMAL(14,2) NOT NULL,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BudgetItem_workId_idx" ON "BudgetItem"("workId");

-- CreateIndex
CREATE INDEX "BudgetItem_taskId_idx" ON "BudgetItem"("taskId");

-- CreateIndex
CREATE INDEX "FinancialTransaction_stageId_idx" ON "FinancialTransaction"("stageId");

-- CreateIndex
CREATE INDEX "FinancialTransaction_taskId_idx" ON "FinancialTransaction"("taskId");

-- CreateIndex
CREATE INDEX "Invoice_stageId_idx" ON "Invoice"("stageId");

-- CreateIndex
CREATE INDEX "Invoice_taskId_idx" ON "Invoice"("taskId");

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "PlanningStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "PlanningTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "PlanningStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "PlanningTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetItem" ADD CONSTRAINT "BudgetItem_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetItem" ADD CONSTRAINT "BudgetItem_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "PlanningTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

