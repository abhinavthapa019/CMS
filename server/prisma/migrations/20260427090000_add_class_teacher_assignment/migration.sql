-- Create class-level teacher ownership for attendance
CREATE TABLE "public"."ClassTeacherAssignment" (
    "id" SERIAL NOT NULL,
    "teacherId" INTEGER NOT NULL,
    "batch" "public"."AcademicBatch" NOT NULL,
    "faculty" "public"."Faculty" NOT NULL,
    "section" "public"."Section" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassTeacherAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClassTeacherAssignment_batch_faculty_section_key"
ON "public"."ClassTeacherAssignment"("batch", "faculty", "section");

CREATE INDEX "ClassTeacherAssignment_teacherId_idx"
ON "public"."ClassTeacherAssignment"("teacherId");

ALTER TABLE "public"."ClassTeacherAssignment"
ADD CONSTRAINT "ClassTeacherAssignment_teacherId_fkey"
FOREIGN KEY ("teacherId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
