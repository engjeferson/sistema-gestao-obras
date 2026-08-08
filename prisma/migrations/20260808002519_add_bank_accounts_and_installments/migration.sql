-- CreateEnum
CREATE TYPE "BankAccountType" AS ENUM ('CORRENTE', 'POUPANCA', 'CAIXA', 'OUTRA');

-- AlterTable
ALTER TABLE "FinancialTransaction" ADD COLUMN     "bankAccountId" TEXT,
ADD COLUMN     "parcelaGrupoId" TEXT,
ADD COLUMN     "parcelaNumero" INTEGER,
ADD COLUMN     "parcelaTotal" INTEGER;

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "banco" TEXT,
    "agencia" TEXT,
    "conta" TEXT,
    "tipo" "BankAccountType" NOT NULL DEFAULT 'CORRENTE',
    "saldoInicial" DECIMAL(14,2),
    "observacoes" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinancialTransaction_parcelaGrupoId_idx" ON "FinancialTransaction"("parcelaGrupoId");

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
