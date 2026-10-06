-- CreateEnum
CREATE TYPE "PreLancamentoOrigin" AS ENUM ('MANUAL', 'IA');

-- CreateEnum
CREATE TYPE "PreLancamentoStatus" AS ENUM ('PENDENTE', 'RECUSADO', 'FINALIZADO');

-- CreateTable
CREATE TABLE "PreLancamento" (
    "id" TEXT NOT NULL,
    "workId" TEXT,
    "stageId" TEXT,
    "tipo" "TransactionType" NOT NULL,
    "descricao" TEXT NOT NULL,
    "categoriaId" TEXT,
    "favorecidoNome" TEXT,
    "valor" DECIMAL(14,2) NOT NULL,
    "dataVencimento" DATE,
    "observacao" TEXT,
    "origem" "PreLancamentoOrigin" NOT NULL DEFAULT 'MANUAL',
    "status" "PreLancamentoStatus" NOT NULL DEFAULT 'PENDENTE',
    "motivoRecusa" TEXT,
    "rawInput" TEXT,
    "financialTransactionId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreLancamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreLancamentoAttachment" (
    "id" TEXT NOT NULL,
    "preLancamentoId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PreLancamentoAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PreLancamento_financialTransactionId_key" ON "PreLancamento"("financialTransactionId");

-- CreateIndex
CREATE INDEX "PreLancamento_workId_idx" ON "PreLancamento"("workId");

-- CreateIndex
CREATE INDEX "PreLancamento_status_idx" ON "PreLancamento"("status");

-- CreateIndex
CREATE INDEX "PreLancamentoAttachment_preLancamentoId_idx" ON "PreLancamentoAttachment"("preLancamentoId");

-- AddForeignKey
ALTER TABLE "PreLancamento" ADD CONSTRAINT "PreLancamento_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreLancamento" ADD CONSTRAINT "PreLancamento_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "PlanningStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreLancamento" ADD CONSTRAINT "PreLancamento_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "FinancialCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreLancamento" ADD CONSTRAINT "PreLancamento_financialTransactionId_fkey" FOREIGN KEY ("financialTransactionId") REFERENCES "FinancialTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreLancamento" ADD CONSTRAINT "PreLancamento_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreLancamentoAttachment" ADD CONSTRAINT "PreLancamentoAttachment_preLancamentoId_fkey" FOREIGN KEY ("preLancamentoId") REFERENCES "PreLancamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;
