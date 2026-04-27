-- Enforce one class-teacher role per teacher
CREATE UNIQUE INDEX "ClassTeacherAssignment_teacherId_key"
ON "public"."ClassTeacherAssignment"("teacherId");
