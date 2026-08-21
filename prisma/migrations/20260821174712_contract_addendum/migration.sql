-- CreateTable
CREATE TABLE "ContractAddendum" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "descricao" TEXT,
    "valor" DECIMAL(14,2) NOT NULL,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractAddendum_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContractAddendum_contractId_idx" ON "ContractAddendum"("contractId");

-- AddForeignKey
ALTER TABLE "ContractAddendum" ADD CONSTRAINT "ContractAddendum_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
