-- AlterTable
ALTER TABLE "Contract" ADD COLUMN     "direcao" "TransactionType" NOT NULL DEFAULT 'PAGAR';

-- AlterTable
ALTER TABLE "FinancialTransaction" ADD COLUMN     "contractMeasurementId" TEXT;

-- CreateTable
CREATE TABLE "ContractMeasurement" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "data" DATE NOT NULL,
    "descricao" TEXT,
    "valor" DECIMAL(14,2) NOT NULL,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractMeasurement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContractMeasurement_contractId_numero_key" ON "ContractMeasurement"("contractId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialTransaction_contractMeasurementId_key" ON "FinancialTransaction"("contractMeasurementId");

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_contractMeasurementId_fkey" FOREIGN KEY ("contractMeasurementId") REFERENCES "ContractMeasurement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractMeasurement" ADD CONSTRAINT "ContractMeasurement_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
