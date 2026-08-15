-- DropForeignKey
ALTER TABLE "Work" DROP CONSTRAINT "Work_encarregadoId_fkey";

-- DropForeignKey
ALTER TABLE "Work" DROP CONSTRAINT "Work_responsavelTecnicoId_fkey";

-- Responsavel tecnico / encarregado passam a apontar para Profissionais em vez de
-- Usuarios do sistema; os valores atuais (cuids de User) nao existem em Professional.
UPDATE "Work" SET "responsavelTecnicoId" = NULL, "encarregadoId" = NULL;

-- AlterTable
ALTER TABLE "Professional" DROP COLUMN "funcao",
ADD COLUMN     "tipoId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "ProfessionalType" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ProfessionalType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalType_nome_key" ON "ProfessionalType"("nome");

-- CreateIndex
CREATE INDEX "Professional_tipoId_idx" ON "Professional"("tipoId");

-- AddForeignKey
ALTER TABLE "Professional" ADD CONSTRAINT "Professional_tipoId_fkey" FOREIGN KEY ("tipoId") REFERENCES "ProfessionalType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Work" ADD CONSTRAINT "Work_responsavelTecnicoId_fkey" FOREIGN KEY ("responsavelTecnicoId") REFERENCES "Professional"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Work" ADD CONSTRAINT "Work_encarregadoId_fkey" FOREIGN KEY ("encarregadoId") REFERENCES "Professional"("id") ON DELETE SET NULL ON UPDATE CASCADE;
