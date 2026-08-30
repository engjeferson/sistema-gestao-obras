-- AlterTable
ALTER TABLE "Contract" ADD COLUMN     "ordem" INTEGER NOT NULL DEFAULT 0;

-- Preserva a ordem visual atual (por data desc) como ponto de partida pro drag manual
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "workId" ORDER BY "data" DESC, "createdAt" DESC) - 1 AS rn
  FROM "Contract"
)
UPDATE "Contract" SET "ordem" = ranked.rn
FROM ranked
WHERE "Contract".id = ranked.id;
