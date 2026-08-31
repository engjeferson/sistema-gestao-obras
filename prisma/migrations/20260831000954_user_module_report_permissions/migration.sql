-- AlterTable
ALTER TABLE "User" ADD COLUMN     "modulePermissions" JSONB,
ADD COLUMN     "reportPermissions" JSONB,
ADD COLUMN     "verValoresSensiveis" BOOLEAN NOT NULL DEFAULT true;
