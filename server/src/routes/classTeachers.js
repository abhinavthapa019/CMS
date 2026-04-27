const { Router } = require("express");
const { z } = require("zod");
const { AcademicBatch, Faculty, Role, Section } = require("@prisma/client");
const { prisma } = require("../lib/prisma");
const { requireAuth } = require("../middlewares/auth");
const { validate } = require("../middlewares/validate");

const router = Router();

const assignClassTeacherSchema = z.object({
  body: z.object({
    teacherId: z.number().int().positive(),
    batch: z.nativeEnum(AcademicBatch),
    faculty: z.nativeEnum(Faculty),
    section: z.nativeEnum(Section),
  }),
});

router.get("/api/class-teacher-assignments", requireAuth(), async (req, res) => {
  const where = req.user.role === Role.TEACHER
    ? { teacherId: req.user.userId }
    : {};

  const assignments = await prisma.classTeacherAssignment.findMany({
    where,
    include: {
      teacher: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: [
      { batch: "asc" },
      { faculty: "asc" },
      { section: "asc" },
    ],
  });

  return res.json({ ok: true, assignments });
});

router.put(
  "/api/class-teacher-assignments",
  requireAuth(Role.ADMIN),
  validate(assignClassTeacherSchema),
  async (req, res) => {
    const { teacherId, batch, faculty, section } = req.validated.body;

    const teacher = await prisma.user.findUnique({ where: { id: teacherId } });
    if (!teacher || teacher.role !== Role.TEACHER) {
      return res.status(404).json({ ok: false, error: "Teacher not found" });
    }

    try {
      const assignment = await prisma.classTeacherAssignment.upsert({
        where: {
          batch_faculty_section: {
            batch,
            faculty,
            section,
          },
        },
        update: {
          teacherId,
        },
        create: {
          teacherId,
          batch,
          faculty,
          section,
        },
        include: {
          teacher: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return res.json({ ok: true, assignment });
    } catch (err) {
      if (err.code === "P2002") {
        return res.status(409).json({ ok: false, error: "This teacher is already assigned as class teacher for another class" });
      }
      return res.status(500).json({ ok: false, error: "Failed to assign class teacher" });
    }
  }
);

router.delete("/api/class-teacher-assignments/:id", requireAuth(Role.ADMIN), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ ok: false, error: "Invalid assignment id" });
  }

  const existing = await prisma.classTeacherAssignment.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ ok: false, error: "Assignment not found" });
  }

  try {
    await prisma.classTeacherAssignment.delete({ where: { id } });
    return res.json({ ok: true, deletedAssignmentId: id });
  } catch {
    return res.status(500).json({ ok: false, error: "Failed to remove class teacher assignment" });
  }
});

module.exports = router;
