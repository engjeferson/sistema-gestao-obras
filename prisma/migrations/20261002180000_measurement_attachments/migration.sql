CREATE TABLE "MeasurementAttachment" (
    "id" TEXT NOT NULL,
    "measurementId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MeasurementAttachment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MeasurementAttachment_measurementId_idx" ON "MeasurementAttachment"("measurementId");
ALTER TABLE "MeasurementAttachment" ADD CONSTRAINT "MeasurementAttachment_measurementId_fkey" FOREIGN KEY ("measurementId") REFERENCES "ContractMeasurement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "MeasurementAttachment" ("id", "measurementId", "url", "nome", "createdAt")
SELECT gen_random_uuid()::text, "id", "arquivoUrl", split_part("arquivoUrl", '/', -1), "createdAt"
FROM "ContractMeasurement"
WHERE "arquivoUrl" IS NOT NULL;

ALTER TABLE "ContractMeasurement" DROP COLUMN "arquivoUrl";
