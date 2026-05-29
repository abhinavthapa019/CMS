/*
  Warnings:

  - You are about to drop the column `activities` on the `Mark` table. All the data in the column will be lost.
  - You are about to drop the column `finalGrade` on the `Mark` table. All the data in the column will be lost.
  - You are about to drop the column `g1` on the `Mark` table. All the data in the column will be lost.
  - You are about to drop the column `g2` on the `Mark` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[studentId,subjectId]` on the table `Mark` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `marks` to the `Mark` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subjectId` to the `Mark` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Mark" DROP CONSTRAINT "Mark_teacherId_fkey";

-- AlterTable
ALTER TABLE "public"."Mark" DROP COLUMN "activities",
DROP COLUMN "finalGrade",
DROP COLUMN "g1",
DROP COLUMN "g2",
ADD COLUMN     "marks" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "subjectId" INTEGER NOT NULL,
ALTER COLUMN "teacherId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."Student" ADD COLUMN     "grade10Score" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "grade8Score" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "grade9Score" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Mark_subjectId_idx" ON "public"."Mark"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "Mark_studentId_subjectId_key" ON "public"."Mark"("studentId", "subjectId");

-- AddForeignKey
ALTER TABLE "public"."Mark" ADD CONSTRAINT "Mark_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "public"."Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Mark" ADD CONSTRAINT "Mark_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
