-- AlterTable
ALTER TABLE "PreLancamento" ADD COLUMN "bankAccountId" TEXT,
ADD COLUMN "formaPagamento" "PaymentMethod",
ADD COLUMN "contaPaga" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "dataPagamento" DATE;

-- AddForeignKey
ALTER TABLE "PreLancamento" ADD CONSTRAINT "PreLancamento_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
