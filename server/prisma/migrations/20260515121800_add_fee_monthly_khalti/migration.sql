/*
  Warnings:

  - A unique constraint covering the columns `[paymentPidx]` on the table `Fee` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[studentId,billingYear,billingMonth,type]` on the table `Fee` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "public"."FeeType" AS ENUM ('MONTHLY', 'MANUAL');

-- AlterTable
ALTER TABLE "public"."Fee" ADD COLUMN     "billingMonth" INTEGER,
ADD COLUMN     "billingYear" INTEGER,
ADD COLUMN     "paymentPidx" TEXT,
ADD COLUMN     "paymentProvider" TEXT,
ADD COLUMN     "paymentStatus" TEXT,
ADD COLUMN     "paymentTransactionId" TEXT,
ADD COLUMN     "type" "public"."FeeType" NOT NULL DEFAULT 'MANUAL';

-- CreateIndex
CREATE UNIQUE INDEX "Fee_paymentPidx_key" ON "public"."Fee"("paymentPidx");

-- CreateIndex
CREATE UNIQUE INDEX "Fee_studentId_billingYear_billingMonth_type_key" ON "public"."Fee"("studentId", "billingYear", "billingMonth", "type");
