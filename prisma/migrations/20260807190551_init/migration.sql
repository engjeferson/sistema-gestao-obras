-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMINISTRADOR', 'ENGENHEIRO', 'OBRA');

-- CreateEnum
CREATE TYPE "WorkStatus" AS ENUM ('PLANEJAMENTO', 'EM_ANDAMENTO', 'PARALISADA', 'CONCLUIDA');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('PAGAR', 'RECEBER');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDENTE', 'PAGO', 'VENCIDO');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('DINHEIRO', 'PIX', 'BOLETO', 'CARTAO', 'TRANSFERENCIA', 'CHEQUE', 'OUTROS');

-- CreateEnum
CREATE TYPE "UnitOfMeasure" AS ENUM ('UN', 'KG', 'M', 'M2', 'M3', 'SACO', 'CAIXA', 'LITRO');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('CONTRATO_CLIENTE', 'EMPREITADA', 'PRESTADOR_SERVICO', 'FORNECEDOR', 'ADITIVO', 'OUTROS');

-- CreateEnum
CREATE TYPE "PlanningStatus" AS ENUM ('NAO_INICIADA', 'EM_ANDAMENTO', 'CONCLUIDA', 'ATRASADA');

-- CreateEnum
CREATE TYPE "OccurrenceType" AS ENUM ('PROBLEMA', 'ATRASO', 'FALTA_MATERIAL', 'ALTERACAO', 'VISITA', 'OBSERVACAO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanySettings" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT,
    "endereco" TEXT,
    "telefone" TEXT,
    "logoUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "documento" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "endereco" TEXT,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "documento" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "endereco" TEXT,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialCategory" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "FinancialCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Work" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "clientId" TEXT,
    "telefone" TEXT,
    "endereco" TEXT,
    "valorContrato" DECIMAL(14,2) NOT NULL,
    "areaConstruida" DECIMAL(10,2),
    "dataInicio" DATE NOT NULL,
    "dataPrevistaTermino" DATE NOT NULL,
    "status" "WorkStatus" NOT NULL DEFAULT 'PLANEJAMENTO',
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Work_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialTransaction" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "tipo" "TransactionType" NOT NULL,
    "descricao" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "favorecidoNome" TEXT NOT NULL,
    "supplierId" TEXT,
    "clientId" TEXT,
    "valor" DECIMAL(14,2) NOT NULL,
    "dataEmissao" DATE NOT NULL,
    "dataVencimento" DATE NOT NULL,
    "dataPagamento" DATE,
    "formaPagamento" "PaymentMethod",
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDENTE',
    "observacao" TEXT,
    "invoiceId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "dataEmissao" DATE NOT NULL,
    "valorTotal" DECIMAL(14,2) NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "arquivoUrl" TEXT,
    "arquivoXmlUrl" TEXT,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "material" TEXT NOT NULL,
    "quantidade" DECIMAL(12,3) NOT NULL,
    "unidade" "UnitOfMeasure" NOT NULL,
    "valorUnitario" DECIMAL(14,2) NOT NULL,
    "valorTotal" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "ContractType" NOT NULL,
    "contratante" TEXT NOT NULL,
    "contratado" TEXT NOT NULL,
    "valor" DECIMAL(14,2),
    "data" DATE NOT NULL,
    "observacoes" TEXT,
    "arquivoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanningStage" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanningStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanningTask" (
    "id" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "dataInicioPrevista" DATE NOT NULL,
    "dataFimPrevista" DATE NOT NULL,
    "percentualExecutado" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "status" "PlanningStatus" NOT NULL DEFAULT 'NAO_INICIADA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanningTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rdo" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "data" DATE NOT NULL,
    "responsavelId" TEXT NOT NULL,
    "clima" TEXT,
    "observacoesGerais" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rdo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RdoWorker" (
    "id" TEXT NOT NULL,
    "rdoId" TEXT NOT NULL,
    "funcao" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,

    CONSTRAINT "RdoWorker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RdoActivity" (
    "id" TEXT NOT NULL,
    "rdoId" TEXT NOT NULL,
    "planningTaskId" TEXT NOT NULL,
    "descricaoServico" TEXT NOT NULL,
    "percentualAnterior" DECIMAL(5,2) NOT NULL,
    "percentualAtual" DECIMAL(5,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RdoActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RdoPhoto" (
    "id" TEXT NOT NULL,
    "rdoId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "descricao" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RdoPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RdoOccurrence" (
    "id" TEXT NOT NULL,
    "rdoId" TEXT NOT NULL,
    "tipo" "OccurrenceType" NOT NULL,
    "descricao" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RdoOccurrence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialCategory_nome_key" ON "FinancialCategory"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Work_codigo_key" ON "Work"("codigo");

-- CreateIndex
CREATE INDEX "Work_status_idx" ON "Work"("status");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialTransaction_invoiceId_key" ON "FinancialTransaction"("invoiceId");

-- CreateIndex
CREATE INDEX "FinancialTransaction_workId_status_idx" ON "FinancialTransaction"("workId", "status");

-- CreateIndex
CREATE INDEX "FinancialTransaction_dataVencimento_idx" ON "FinancialTransaction"("dataVencimento");

-- CreateIndex
CREATE INDEX "Invoice_workId_idx" ON "Invoice"("workId");

-- CreateIndex
CREATE INDEX "Contract_workId_idx" ON "Contract"("workId");

-- CreateIndex
CREATE INDEX "PlanningStage_workId_idx" ON "PlanningStage"("workId");

-- CreateIndex
CREATE INDEX "PlanningTask_workId_status_idx" ON "PlanningTask"("workId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Rdo_workId_numero_key" ON "Rdo"("workId", "numero");

-- AddForeignKey
ALTER TABLE "Work" ADD CONSTRAINT "Work_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "FinancialCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "FinancialCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningStage" ADD CONSTRAINT "PlanningStage_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningTask" ADD CONSTRAINT "PlanningTask_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "PlanningStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningTask" ADD CONSTRAINT "PlanningTask_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rdo" ADD CONSTRAINT "Rdo_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rdo" ADD CONSTRAINT "Rdo_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RdoWorker" ADD CONSTRAINT "RdoWorker_rdoId_fkey" FOREIGN KEY ("rdoId") REFERENCES "Rdo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RdoActivity" ADD CONSTRAINT "RdoActivity_rdoId_fkey" FOREIGN KEY ("rdoId") REFERENCES "Rdo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RdoActivity" ADD CONSTRAINT "RdoActivity_planningTaskId_fkey" FOREIGN KEY ("planningTaskId") REFERENCES "PlanningTask"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RdoPhoto" ADD CONSTRAINT "RdoPhoto_rdoId_fkey" FOREIGN KEY ("rdoId") REFERENCES "Rdo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RdoOccurrence" ADD CONSTRAINT "RdoOccurrence_rdoId_fkey" FOREIGN KEY ("rdoId") REFERENCES "Rdo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
