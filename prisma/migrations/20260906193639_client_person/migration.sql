CREATE TABLE "ClientPerson" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "dataAniversario" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientPerson_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClientPerson_clientId_idx" ON "ClientPerson"("clientId");

ALTER TABLE "ClientPerson" ADD CONSTRAINT "ClientPerson_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
