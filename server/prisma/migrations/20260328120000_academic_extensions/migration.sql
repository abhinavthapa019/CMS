-- CreateEnum
CREATE TYPE "public"."AcademicBatch" AS ENUM ('ELEVEN', 'TWELVE');

-- CreateEnum
CREATE TYPE "public"."Faculty" AS ENUM ('SCIENCE', 'MANAGEMENT');

-- CreateEnum
CREATE TYPE "public"."Section" AS ENUM ('BIO', 'CS', 'ECONOMICS', 'MARKETING');

-- AlterTable
ALTER TABLE "public"."Student"
ADD COLUMN "batch" "public"."AcademicBatch" NOT NULL DEFAULT 'ELEVEN',
ADD COLUMN "faculty" "public"."Faculty" NOT NULL DEFAULT 'SCIENCE',
ADD COLUMN "section" "public"."Section" NOT NULL DEFAULT 'BIO';

-- CreateTable
CREATE TABLE "public"."Subject" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "faculty" "public"."Faculty",
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TeacherSubjectAssignment" (
    "id" SERIAL NOT NULL,
    "teacherId" INTEGER NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "batch" "public"."AcademicBatch",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeacherSubjectAssignment_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "public"."Attendance"
ADD COLUMN "subjectId" INTEGER;

-- CreateIndex
CREATE INDEX "Student_batch_faculty_section_idx" ON "public"."Student"("batch", "faculty", "section");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_name_faculty_key" ON "public"."Subject"("name", "faculty");

-- CreateIndex
CREATE INDEX "Subject_faculty_idx" ON "public"."Subject"("faculty");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherSubjectAssignment_teacherId_subjectId_batch_key" ON "public"."TeacherSubjectAssignment"("teacherId", "subjectId", "batch");

-- CreateIndex
CREATE INDEX "TeacherSubjectAssignment_teacherId_idx" ON "public"."TeacherSubjectAssignment"("teacherId");

-- CreateIndex
CREATE INDEX "TeacherSubjectAssignment_subjectId_idx" ON "public"."TeacherSubjectAssignment"("subjectId");

-- CreateIndex
CREATE INDEX "Attendance_date_idx" ON "public"."Attendance"("date");

-- CreateIndex
CREATE INDEX "Attendance_subjectId_idx" ON "public"."Attendance"("subjectId");

-- AddForeignKey
ALTER TABLE "public"."TeacherSubjectAssignment" ADD CONSTRAINT "TeacherSubjectAssignment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeacherSubjectAssignment" ADD CONSTRAINT "TeacherSubjectAssignment_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "public"."Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Attendance" ADD CONSTRAINT "Attendance_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "public"."Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
