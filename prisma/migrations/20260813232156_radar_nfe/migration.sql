-- CreateEnum
CREATE TYPE "IncomingNFeStatus" AS ENUM ('PENDENTE', 'LANCADA', 'IGNORADA');

-- AlterTable
ALTER TABLE "CompanySettings" ADD COLUMN     "sefazUltimoNsu" TEXT,
ADD COLUMN     "uf" TEXT;

-- CreateTable
CREATE TABLE "IncomingNFe" (
    "id" TEXT NOT NULL,
    "chaveAcesso" TEXT NOT NULL,
    "nsu" TEXT NOT NULL,
    "emitenteCnpj" TEXT,
    "emitenteNome" TEXT,
    "numero" TEXT,
    "serie" TEXT,
    "dataEmissao" DATE,
    "valorTotal" DECIMAL(14,2),
    "status" "IncomingNFeStatus" NOT NULL DEFAULT 'PENDENTE',
    "xmlCompleto" TEXT,
    "invoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncomingNFe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IncomingNFe_chaveAcesso_key" ON "IncomingNFe"("chaveAcesso");

-- CreateIndex
CREATE UNIQUE INDEX "IncomingNFe_invoiceId_key" ON "IncomingNFe"("invoiceId");

-- CreateIndex
CREATE INDEX "IncomingNFe_status_idx" ON "IncomingNFe"("status");

-- CreateIndex
CREATE INDEX "IncomingNFe_emitenteCnpj_idx" ON "IncomingNFe"("emitenteCnpj");

-- AddForeignKey
ALTER TABLE "IncomingNFe" ADD CONSTRAINT "IncomingNFe_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

