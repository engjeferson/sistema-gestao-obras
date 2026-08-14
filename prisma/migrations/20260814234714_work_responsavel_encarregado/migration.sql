-- AlterTable
ALTER TABLE "Work" ADD COLUMN     "encarregadoId" TEXT,
ADD COLUMN     "responsavelTecnicoId" TEXT;

-- AddForeignKey
ALTER TABLE "Work" ADD CONSTRAINT "Work_responsavelTecnicoId_fkey" FOREIGN KEY ("responsavelTecnicoId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Work" ADD CONSTRAINT "Work_encarregadoId_fkey" FOREIGN KEY ("encarregadoId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

