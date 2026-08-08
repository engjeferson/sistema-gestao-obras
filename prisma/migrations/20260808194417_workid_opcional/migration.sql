-- AlterTable
ALTER TABLE "FinancialTransaction" ALTER COLUMN "workId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Invoice" ALTER COLUMN "workId" DROP NOT NULL;

