const { Router } = require("express");
const { z } = require("zod");
const { AcademicBatch, Faculty, Role, Section } = require("@prisma/client");
const { prisma } = require("../lib/prisma");
const { requireAuth } = require("../middlewares/auth");
const { validate } = require("../middlewares/validate");

const router = Router();

const CLASS_OPTIONS = {
  batches: Object.values(AcademicBatch),
  faculties: Object.values(Faculty),
  sections: Object.values(Section),
};

const createSubjectSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    faculty: z.nativeEnum(Faculty).nullable().optional(),
    isOptional: z.boolean().optional().default(false),
  }),
});

const assignmentSchema = z.object({
  body: z.object({
    teacherId: z.number().int().positive(),
    subjectId: z.number().int().positive(),
    batch: z.nativeEnum(AcademicBatch).nullable().optional(),
  }),
});

router.get("/api/academics/options", requireAuth(), async (req, res) => {
  return res.json({ ok: true, ...CLASS_OPTIONS });
});

router.get("/api/subjects", requireAuth(), async (req, res) => {
  const subjects = await prisma.subject.findMany({
    orderBy: [{ faculty: "asc" }, { name: "asc" }],
  });
  return res.json({ ok: true, subjects });
});

router.post("/api/subjects", requireAuth(Role.ADMIN), validate(createSubjectSchema), async (req, res) => {
  const { name, faculty, isOptional } = req.validated.body;
  try {
    const subject = await prisma.subject.create({
      data: {
        name: name.trim(),
        faculty: faculty ?? null,
        isOptional,
      },
    });
    return res.status(201).json({ ok: true, subject });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ ok: false, error: "Subject already exists" });
    }
    return res.status(500).json({ ok: false, error: "Failed to create subject" });
  }
});

router.get("/api/teacher-subject-assignments", requireAuth(), async (req, res) => {
  const teacherId = req.query.teacherId ? Number(req.query.teacherId) : undefined;
  if (req.query.teacherId && !Number.isInteger(teacherId)) {
    return res.status(400).json({ ok: false, error: "Invalid teacherId" });
  }

  if (req.user.role === Role.TEACHER && teacherId && req.user.userId !== teacherId) {
    return res.status(403).json({ ok: false, error: "Forbidden" });
  }

  const where = {};
  if (req.user.role === Role.TEACHER) {
    where.teacherId = req.user.userId;
  } else if (teacherId) {
    where.teacherId = teacherId;
  }

  const assignments = await prisma.teacherSubjectAssignment.findMany({
    where,
    include: {
      teacher: { select: { id: true, name: true, email: true } },
      subject: true,
    },
    orderBy: [{ teacherId: "asc" }, { subjectId: "asc" }, { batch: "asc" }],
  });

  return res.json({ ok: true, assignments });
});

router.post(
  "/api/teacher-subject-assignments",
  requireAuth(Role.ADMIN),
  validate(assignmentSchema),
  async (req, res) => {
    const { teacherId, subjectId, batch } = req.validated.body;

    const [teacher, subject] = await Promise.all([
      prisma.user.findUnique({ where: { id: teacherId } }),
      prisma.subject.findUnique({ where: { id: subjectId } }),
    ]);

    if (!teacher || teacher.role !== Role.TEACHER) {
      return res.status(404).json({ ok: false, error: "Teacher not found" });
    }

    if (!subject) {
      return res.status(404).json({ ok: false, error: "Subject not found" });
    }

    try {
      const assignment = await prisma.teacherSubjectAssignment.create({
        data: {
          teacherId,
          subjectId,
          batch: batch ?? null,
        },
      });
      return res.status(201).json({ ok: true, assignment });
    } catch (err) {
      if (err.code === "P2002") {
        return res.status(409).json({ ok: false, error: "Assignment already exists" });
      }
      return res.status(500).json({ ok: false, error: "Failed to create assignment" });
    }
  }
);

module.exports = router;
