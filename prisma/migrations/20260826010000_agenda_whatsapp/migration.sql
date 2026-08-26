-- CreateEnum
CREATE TYPE "AgendaEventSource" AS ENUM ('MANUAL', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "AgendaEventStatus" AS ENUM ('CONFIRMADO', 'CANCELADO');

-- CreateTable
CREATE TABLE "WhatsAppAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgendaEvent" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "local" TEXT,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fim" TIMESTAMP(3),
    "diaTodo" BOOLEAN NOT NULL DEFAULT false,
    "status" "AgendaEventStatus" NOT NULL DEFAULT 'CONFIRMADO',
    "origem" "AgendaEventSource" NOT NULL DEFAULT 'MANUAL',
    "workId" TEXT,
    "clientId" TEXT,
    "createdById" TEXT,
    "mensagemOriginal" TEXT,
    "whatsappTelefone" TEXT,
    "whatsappMessageId" TEXT,
    "lembreteEnviadoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgendaEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppAccount_userId_key" ON "WhatsAppAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppAccount_telefone_key" ON "WhatsAppAccount"("telefone");

-- CreateIndex
CREATE UNIQUE INDEX "AgendaEvent_whatsappMessageId_key" ON "AgendaEvent"("whatsappMessageId");

-- CreateIndex
CREATE INDEX "AgendaEvent_inicio_idx" ON "AgendaEvent"("inicio");

-- CreateIndex
CREATE INDEX "AgendaEvent_workId_idx" ON "AgendaEvent"("workId");

-- CreateIndex
CREATE INDEX "AgendaEvent_clientId_idx" ON "AgendaEvent"("clientId");

-- CreateIndex
CREATE INDEX "AgendaEvent_status_idx" ON "AgendaEvent"("status");

-- AddForeignKey
ALTER TABLE "WhatsAppAccount" ADD CONSTRAINT "WhatsAppAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgendaEvent" ADD CONSTRAINT "AgendaEvent_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgendaEvent" ADD CONSTRAINT "AgendaEvent_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgendaEvent" ADD CONSTRAINT "AgendaEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
