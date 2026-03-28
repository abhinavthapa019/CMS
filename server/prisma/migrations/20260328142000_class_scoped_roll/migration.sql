-- Drop global unique roll number and add class-scoped roll uniqueness
DROP INDEX IF EXISTS "public"."Student_rollNumber_key";

CREATE UNIQUE INDEX "Student_batch_faculty_section_rollNumber_key"
ON "public"."Student"("batch", "faculty", "section", "rollNumber");
