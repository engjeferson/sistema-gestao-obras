-- AlterTable
ALTER TABLE "User" ADD COLUMN     "restringirObras" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "UserWork" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserWork_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserWork_workId_idx" ON "UserWork"("workId");

-- CreateIndex
CREATE UNIQUE INDEX "UserWork_userId_workId_key" ON "UserWork"("userId", "workId");

-- AddForeignKey
ALTER TABLE "UserWork" ADD CONSTRAINT "UserWork_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWork" ADD CONSTRAINT "UserWork_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;
