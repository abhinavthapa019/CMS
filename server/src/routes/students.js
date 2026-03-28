const { Router } = require("express");
const { z } = require("zod");
const { AcademicBatch, Faculty, Job, Role, Section } = require("@prisma/client");
const { prisma } = require("../lib/prisma");
const { requireAuth } = require("../middlewares/auth");
const { validate } = require("../middlewares/validate");

const router = Router();

function classCombosForAssignment(assignment) {
  const batches = assignment.batch ? [assignment.batch] : [AcademicBatch.ELEVEN, AcademicBatch.TWELVE];
  const faculty = assignment.subject?.faculty;

  if (faculty === Faculty.SCIENCE) {
    return batches.flatMap((batch) => [
      { batch, faculty: Faculty.SCIENCE, section: Section.BIO },
      { batch, faculty: Faculty.SCIENCE, section: Section.CS },
    ]);
  }

  if (faculty === Faculty.MANAGEMENT) {
    return batches.flatMap((batch) => [
      { batch, faculty: Faculty.MANAGEMENT, section: Section.ECONOMICS },
      { batch, faculty: Faculty.MANAGEMENT, section: Section.MARKETING },
    ]);
  }

  return batches.flatMap((batch) => [
    { batch, faculty: Faculty.SCIENCE, section: Section.BIO },
    { batch, faculty: Faculty.SCIENCE, section: Section.CS },
    { batch, faculty: Faculty.MANAGEMENT, section: Section.ECONOMICS },
    { batch, faculty: Faculty.MANAGEMENT, section: Section.MARKETING },
  ]);
}

function classKey(c) {
  return `${c.batch}|${c.faculty}|${c.section}`;
}

async function getTeacherAllowedClasses(teacherId, subjectId) {
  const where = {
    teacherId,
  };
  if (subjectId) where.subjectId = subjectId;

  const assignments = await prisma.teacherSubjectAssignment.findMany({
    where,
    include: {
      subject: {
        select: {
          faculty: true,
        },
      },
    },
  });

  const set = new Set();
  for (const assignment of assignments) {
    for (const combo of classCombosForAssignment(assignment)) {
      set.add(classKey(combo));
    }
  }
  return set;
}

const createStudentSchema = z.object({
  body: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    rollNumber: z.string().min(1),
    batch: z.nativeEnum(AcademicBatch),
    faculty: z.nativeEnum(Faculty),
    section: z.nativeEnum(Section),
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
      return res.status(409).json({ ok: false, error: "rollNumber already exists in this class" });
    }
    return res.status(500).json({ ok: false, error: "Failed to create student" });
  }
});

router.get("/api/students", requireAuth(), async (req, res) => {
  if (req.user.role !== Role.ADMIN && req.user.role !== Role.TEACHER) {
    return res.status(403).json({ ok: false, error: "Forbidden" });
  }

  const validBatch = req.query.batch ? Object.values(AcademicBatch).includes(req.query.batch) : true;
  const validFaculty = req.query.faculty ? Object.values(Faculty).includes(req.query.faculty) : true;
  const validSection = req.query.section ? Object.values(Section).includes(req.query.section) : true;
  if (!validBatch || !validFaculty || !validSection) {
    return res.status(400).json({ ok: false, error: "Invalid class filter values" });
  }

  const where = {};
  if (req.query.batch) where.batch = req.query.batch;
  if (req.query.faculty) where.faculty = req.query.faculty;
  if (req.query.section) where.section = req.query.section;

  if (req.user.role === Role.TEACHER) {
    const subjectId = req.query.subjectId ? Number(req.query.subjectId) : undefined;
    if (req.query.subjectId && !Number.isInteger(subjectId)) {
      return res.status(400).json({ ok: false, error: "Invalid subjectId" });
    }

    const allowed = await getTeacherAllowedClasses(req.user.userId, subjectId);
    if (allowed.size === 0) {
      return res.json({ ok: true, students: [] });
    }

    const classFilterProvided = req.query.batch && req.query.faculty && req.query.section;
    if (classFilterProvided) {
      const requested = classKey({ batch: req.query.batch, faculty: req.query.faculty, section: req.query.section });
      if (!allowed.has(requested)) {
        return res.status(403).json({ ok: false, error: "You do not have access to this class" });
      }
    }

    where.OR = [...allowed].map((key) => {
      const [batch, faculty, section] = key.split("|");
      return { batch, faculty, section };
    });
  }

  const students = await prisma.student.findMany({
    where,
    orderBy: [{ batch: "asc" }, { faculty: "asc" }, { section: "asc" }, { rollNumber: "asc" }],
  });
  return res.json({ ok: true, students });
});

router.get("/api/students/attendance-summary", requireAuth(Role.ADMIN), async (req, res) => {
  const validBatch = req.query.batch ? Object.values(AcademicBatch).includes(req.query.batch) : true;
  const validFaculty = req.query.faculty ? Object.values(Faculty).includes(req.query.faculty) : true;
  const validSection = req.query.section ? Object.values(Section).includes(req.query.section) : true;
  if (!validBatch || !validFaculty || !validSection) {
    return res.status(400).json({ ok: false, error: "Invalid class filter values" });
  }

  const subjectId = req.query.subjectId ? Number(req.query.subjectId) : undefined;
  if (req.query.subjectId && !Number.isInteger(subjectId)) {
    return res.status(400).json({ ok: false, error: "Invalid subjectId" });
  }

  const studentWhere = {};
  if (req.query.batch) studentWhere.batch = req.query.batch;
  if (req.query.faculty) studentWhere.faculty = req.query.faculty;
  if (req.query.section) studentWhere.section = req.query.section;

  const students = await prisma.student.findMany({
    where: studentWhere,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      rollNumber: true,
      batch: true,
      faculty: true,
      section: true,
    },
    orderBy: [{ batch: "asc" }, { faculty: "asc" }, { section: "asc" }, { id: "asc" }],
  });

  const attendance = await prisma.attendance.findMany({
    where: subjectId ? { subjectId } : undefined,
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
      batch: student.batch,
      faculty: student.faculty,
      section: student.section,
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
    batch: z.nativeEnum(AcademicBatch).optional(),
    faculty: z.nativeEnum(Faculty).optional(),
    section: z.nativeEnum(Section).optional(),
    subjectId: z.number().int().positive().optional(),
  }),
});

router.post("/api/students/:id/attendance", requireAuth(), validate(attendanceSchema), async (req, res) => {
  if (req.user.role !== Role.ADMIN && req.user.role !== Role.TEACHER) {
    return res.status(403).json({ ok: false, error: "Forbidden" });
  }
  const studentId = Number(req.params.id);
  const { present, date, batch, faculty, section, subjectId } = req.validated.body;

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) {
    return res.status(404).json({ ok: false, error: "Student not found" });
  }

  if ((batch && student.batch !== batch) || (faculty && student.faculty !== faculty) || (section && student.section !== section)) {
    return res.status(400).json({ ok: false, error: "Student does not belong to the selected class" });
  }

  if (req.user.role === Role.TEACHER) {
    const allowed = await getTeacherAllowedClasses(req.user.userId, subjectId);
    const requested = classKey({ batch: student.batch, faculty: student.faculty, section: student.section });
    if (!allowed.has(requested)) {
      return res.status(403).json({ ok: false, error: "You do not have access to this class" });
    }
  }

  const attendanceDate = date ? new Date(date) : new Date();
  if (attendanceDate.getTime() > Date.now()) {
    return res.status(400).json({ ok: false, error: "Attendance date cannot be in the future" });
  }

  if (subjectId) {
    const subjectExists = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subjectExists) {
      return res.status(404).json({ ok: false, error: "Subject not found" });
    }
  }

  try {
    const attendance = await prisma.attendance.create({
      data: {
        studentId,
        teacherId: req.user.userId,
        present,
        date: attendanceDate,
        subjectId: subjectId || null,
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
