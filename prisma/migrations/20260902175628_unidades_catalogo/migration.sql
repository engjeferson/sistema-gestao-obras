-- CreateTable: catálogo de unidades de medida (editável)
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL,
    "sigla" TEXT NOT NULL,
    "nome" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Unit_sigla_key" ON "Unit"("sigla");

-- Seed: unidades já usadas hoje (mesmo texto que passa a ser gravado em
-- Material/InvoiceItem/BudgetItem a partir desta migration)
INSERT INTO "Unit" ("id", "sigla", "nome", "ativo", "createdAt", "updatedAt") VALUES
    ('unit_un', 'un', 'Unidade', true, now(), now()),
    ('unit_kg', 'kg', 'Quilograma', true, now(), now()),
    ('unit_m', 'm', 'Metro', true, now(), now()),
    ('unit_m2', 'm²', 'Metro quadrado', true, now(), now()),
    ('unit_m3', 'm³', 'Metro cúbico', true, now(), now()),
    ('unit_saco', 'saco', 'Saco', true, now(), now()),
    ('unit_caixa', 'caixa', 'Caixa', true, now(), now()),
    ('unit_litro', 'litro', 'Litro', true, now(), now());

-- AlterColumn: Material.unidadePadrao (enum -> texto livre, mesma sigla do catálogo)
ALTER TABLE "Material" ALTER COLUMN "unidadePadrao" TYPE TEXT USING (
    CASE "unidadePadrao"::text
        WHEN 'UN' THEN 'un'
        WHEN 'KG' THEN 'kg'
        WHEN 'M' THEN 'm'
        WHEN 'M2' THEN 'm²'
        WHEN 'M3' THEN 'm³'
        WHEN 'SACO' THEN 'saco'
        WHEN 'CAIXA' THEN 'caixa'
        WHEN 'LITRO' THEN 'litro'
        ELSE "unidadePadrao"::text
    END
);

-- AlterColumn: InvoiceItem.unidade (enum -> texto livre, obrigatório)
ALTER TABLE "InvoiceItem" ALTER COLUMN "unidade" TYPE TEXT USING (
    CASE "unidade"::text
        WHEN 'UN' THEN 'un'
        WHEN 'KG' THEN 'kg'
        WHEN 'M' THEN 'm'
        WHEN 'M2' THEN 'm²'
        WHEN 'M3' THEN 'm³'
        WHEN 'SACO' THEN 'saco'
        WHEN 'CAIXA' THEN 'caixa'
        WHEN 'LITRO' THEN 'litro'
        ELSE "unidade"::text
    END
);

-- AlterColumn: BudgetItem.unidade (enum -> texto livre, opcional)
ALTER TABLE "BudgetItem" ALTER COLUMN "unidade" TYPE TEXT USING (
    CASE "unidade"::text
        WHEN 'UN' THEN 'un'
        WHEN 'KG' THEN 'kg'
        WHEN 'M' THEN 'm'
        WHEN 'M2' THEN 'm²'
        WHEN 'M3' THEN 'm³'
        WHEN 'SACO' THEN 'saco'
        WHEN 'CAIXA' THEN 'caixa'
        WHEN 'LITRO' THEN 'litro'
        ELSE "unidade"::text
    END
);

-- DropEnum
DROP TYPE "UnitOfMeasure";
