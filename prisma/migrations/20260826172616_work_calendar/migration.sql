-- AlterTable
ALTER TABLE "Work" ADD COLUMN     "workingWeekdays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5]::INTEGER[];

-- CreateTable
CREATE TABLE "WorkHoliday" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "descricao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkHoliday_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkHoliday_workId_idx" ON "WorkHoliday"("workId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkHoliday_workId_data_key" ON "WorkHoliday"("workId", "data");

-- AddForeignKey
ALTER TABLE "WorkHoliday" ADD CONSTRAINT "WorkHoliday_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;
