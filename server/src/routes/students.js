const { Router } = require("express");
const { z } = require("zod");
const { Job, Role } = require("@prisma/client");
const { prisma } = require("../lib/prisma");
const { requireAuth } = require("../middlewares/auth");
const { validate } = require("../middlewares/validate");

const router = Router();

const createStudentSchema = z.object({
  body: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    rollNumber: z.string().min(1),
    motherJob: z.nativeEnum(Job),
    fatherJob: z.nativeEnum(Job),
    travelTime: z.number().int().min(0).max(10),
  }),
});

router.post("/api/students", requireAuth(Role.ADMIN), validate(createStudentSchema), async (req, res) => {
  const data = req.validated.body;
  try {
    const student = await prisma.student.create({ data });
    return res.status(201).json({ ok: true, student });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ ok: false, error: "rollNumber already exists" });
    }
    return res.status(500).json({ ok: false, error: "Failed to create student" });
  }
});

router.get("/api/students", requireAuth(), async (req, res) => {
  if (req.user.role !== Role.ADMIN && req.user.role !== Role.TEACHER) {
    return res.status(403).json({ ok: false, error: "Forbidden" });
  }
  const students = await prisma.student.findMany();
  return res.json({ ok: true, students });
});

router.get("/api/students/attendance-summary", requireAuth(Role.ADMIN), async (req, res) => {
  const students = await prisma.student.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      rollNumber: true,
    },
    orderBy: { id: "asc" },
  });

  const attendance = await prisma.attendance.findMany({
    select: {
      studentId: true,
      present: true,
      date: true,
    },
  });

  const statsMap = new Map();
  for (const row of attendance) {
    const prev = statsMap.get(row.studentId) || { total: 0, present: 0, latestDate: null };
    prev.total += 1;
    if (row.present) prev.present += 1;
    if (!prev.latestDate || new Date(row.date) > new Date(prev.latestDate)) {
      prev.latestDate = row.date;
    }
    statsMap.set(row.studentId, prev);
  }

  const summary = students.map((student) => {
    const stats = statsMap.get(student.id) || { total: 0, present: 0, latestDate: null };
    const percentage = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;
    return {
      studentId: student.id,
      name: `${student.firstName} ${student.lastName}`,
      rollNumber: student.rollNumber,
      presentCount: stats.present,
      totalCount: stats.total,
      attendancePercent: percentage,
      latestAttendanceDate: stats.latestDate,
    };
  });

  return res.json({ ok: true, summary });
});

router.get("/api/students/:id", requireAuth(), async (req, res) => {
  const id = Number(req.params.id);
  const student = await prisma.student.findUnique({ where: { id } });
  if (!student) return res.status(404).json({ ok: false, error: "Student not found" });
  return res.json({ ok: true, student });
});

router.delete("/api/students/:id", requireAuth(Role.ADMIN), async (req, res) => {
  const studentId = Number(req.params.id);
  if (!Number.isInteger(studentId)) {
    return res.status(400).json({ ok: false, error: "Invalid student id" });
  }

  const existing = await prisma.student.findUnique({ where: { id: studentId } });
  if (!existing) {
    return res.status(404).json({ ok: false, error: "Student not found" });
  }

  try {
    await prisma.$transaction([
      prisma.attendance.deleteMany({ where: { studentId } }),
      prisma.mark.deleteMany({ where: { studentId } }),
      prisma.prediction.deleteMany({ where: { studentId } }),
      prisma.student.delete({ where: { id: studentId } }),
    ]);
    return res.json({ ok: true, deletedStudentId: studentId });
  } catch (err) {
    return res.status(500).json({ ok: false, error: "Failed to delete student" });
  }
});

const attendanceSchema = z.object({
  params: z.object({ id: z.string() }),
  body: z.object({
    present: z.boolean().optional().default(true),
    date: z.string().datetime().optional(),
  }),
});

router.post("/api/students/:id/attendance", requireAuth(), validate(attendanceSchema), async (req, res) => {
  if (req.user.role !== Role.ADMIN && req.user.role !== Role.TEACHER) {
    return res.status(403).json({ ok: false, error: "Forbidden" });
  }
  const studentId = Number(req.params.id);
  const { present, date } = req.validated.body;
  try {
    const attendance = await prisma.attendance.create({
      data: {
        studentId,
        teacherId: req.user.userId,
        present,
        date: date ? new Date(date) : new Date(),
      },
    });
    return res.status(201).json({ ok: true, attendance });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ ok: false, error: "Attendance already recorded for this date" });
    }
    return res.status(500).json({ ok: false, error: "Failed to record attendance" });
  }
});

router.get("/api/students/:id/attendance", requireAuth(), async (req, res) => {
  const studentId = Number(req.params.id);
  const attendance = await prisma.attendance.findMany({
    where: { studentId },
    orderBy: { date: "desc" },
  });
  return res.json({ ok: true, attendance });
});

const marksSchema = z.object({
  params: z.object({ id: z.string() }),
  body: z.object({
    g1: z.number().int().min(0).max(20),
    g2: z.number().int().min(0).max(20),
    finalGrade: z.number().int().min(0).max(20).optional(),
    activities: z.boolean().optional().default(false),
  }),
});

router.post("/api/students/:id/marks", requireAuth(), validate(marksSchema), async (req, res) => {
  if (req.user.role !== Role.ADMIN && req.user.role !== Role.TEACHER) {
    return res.status(403).json({ ok: false, error: "Forbidden" });
  }
  const studentId = Number(req.params.id);
  const { g1, g2, finalGrade, activities } = req.validated.body;
  try {
    const mark = await prisma.mark.create({
      data: {
        g1,
        g2,
        finalGrade,
        activities,
        studentId,
        teacherId: req.user.userId,
      },
    });
    return res.status(201).json({ ok: true, mark });
  } catch (err) {
    return res.status(500).json({ ok: false, error: "Failed to save marks" });
  }
});

router.get("/api/students/:id/marks/latest", requireAuth(), async (req, res) => {
  const studentId = Number(req.params.id);
  const mark = await prisma.mark.findFirst({
    where: { studentId },
    orderBy: { createdAt: "desc" },
  });
  if (!mark) return res.status(404).json({ ok: false, error: "No marks found" });
  return res.json({ ok: true, mark });
});

module.exports = router;
