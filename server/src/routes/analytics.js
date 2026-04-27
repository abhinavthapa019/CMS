const { Router } = require("express");
const { AcademicBatch, Faculty, Role, Section } = require("@prisma/client");
const { prisma } = require("../lib/prisma");
const { requireAuth } = require("../middlewares/auth");

const router = Router();

function toDateKey(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function classKey(student) {
  return `${student.batch}|${student.faculty}|${student.section}`;
}

function withPercent(present, total) {
  if (!total) return 0;
  return Math.round((present / total) * 100);
}

function getCurrentMonthRangeUtc() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  return { start, end };
}

function getCurrentMonthLabel() {
  return new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function classCombosForAssignment(assignment) {
  const batches = assignment.batch ? [assignment.batch] : [AcademicBatch.ELEVEN, AcademicBatch.TWELVE];

  if (assignment.subject?.faculty === Faculty.SCIENCE) {
    return batches.flatMap((batch) => [
      { batch, faculty: Faculty.SCIENCE, section: Section.BIO },
      { batch, faculty: Faculty.SCIENCE, section: Section.CS },
    ]);
  }

  if (assignment.subject?.faculty === Faculty.MANAGEMENT) {
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

async function getAllowedClassSetForTeacher(teacherId) {
  const [assignments, classTeacherRows] = await Promise.all([
    prisma.teacherSubjectAssignment.findMany({
      where: { teacherId },
      include: { subject: { select: { faculty: true } } },
    }),
    prisma.classTeacherAssignment.findMany({
      where: { teacherId },
      select: { batch: true, faculty: true, section: true },
    }),
  ]);

  const allowed = new Set();
  for (const assignment of assignments) {
    for (const cls of classCombosForAssignment(assignment)) {
      allowed.add(classKey(cls));
    }
  }
  for (const row of classTeacherRows) {
    allowed.add(classKey(row));
  }
  return allowed;
}

function buildClassSummary(students, attendanceRows, onlyToday = false) {
  const todayKey = new Date().toISOString().slice(0, 10);
  const map = new Map();
  const studentById = new Map(students.map((s) => [s.id, s]));

  for (const student of students) {
    const key = classKey(student);
    if (!map.has(key)) {
      map.set(key, {
        classKey: key,
        batch: student.batch,
        faculty: student.faculty,
        section: student.section,
        totalStudents: 0,
        presentToday: 0,
        totalPresent: 0,
        totalRows: 0,
      });
    }
    map.get(key).totalStudents += 1;
  }

  for (const row of attendanceRows) {
    const student = studentById.get(row.studentId);
    if (!student) continue;

    const key = classKey(student);
    const item = map.get(key);
    const dateKey = toDateKey(row.date);

    if (onlyToday) {
      if (dateKey === todayKey && row.present) item.presentToday += 1;
      continue;
    }

    item.totalRows += 1;
    if (row.present) item.totalPresent += 1;
    if (dateKey === todayKey && row.present) item.presentToday += 1;
  }

  return [...map.values()].map((item) => ({
    ...item,
    attendancePercent: withPercent(item.totalPresent, item.totalRows),
  }));
}

function buildTrend(attendanceRows) {
  const byDate = new Map();

  for (const row of attendanceRows) {
    const d = toDateKey(row.date);
    const prev = byDate.get(d) || { date: d, present: 0, absent: 0, total: 0 };
    prev.total += 1;
    if (row.present) prev.present += 1;
    else prev.absent += 1;
    byDate.set(d, prev);
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function getLatestPresentCount(attendanceRows) {
  if (!attendanceRows.length) return 0;

  const byDate = new Map();
  for (const row of attendanceRows) {
    const key = toDateKey(row.date);
    const prev = byDate.get(key) || 0;
    byDate.set(key, prev + (row.present ? 1 : 0));
  }

  const latestDateKey = [...byDate.keys()].sort().at(-1);
  if (!latestDateKey) return 0;
  return byDate.get(latestDateKey) || 0;
}

router.get(["/api/analytics/teacher/:teacherId", "/analytics/teacher/:teacherId"], requireAuth(), async (req, res) => {
  const teacherId = Number(req.params.teacherId);
  if (!Number.isInteger(teacherId)) {
    return res.status(400).json({ ok: false, error: "Invalid teacherId" });
  }

  if (req.user.role === Role.TEACHER && req.user.userId !== teacherId) {
    return res.status(403).json({ ok: false, error: "Forbidden" });
  }

  const validBatch = req.query.batch ? Object.values(AcademicBatch).includes(req.query.batch) : true;
  const validFaculty = req.query.faculty ? Object.values(Faculty).includes(req.query.faculty) : true;
  const validSection = req.query.section ? Object.values(Section).includes(req.query.section) : true;
  if (!validBatch || !validFaculty || !validSection) {
    return res.status(400).json({ ok: false, error: "Invalid class filter values" });
  }

  const whereStudent = {};
  const monthRange = getCurrentMonthRangeUtc();
  const periodLabel = getCurrentMonthLabel();
  if (req.query.batch) whereStudent.batch = req.query.batch;
  if (req.query.faculty) whereStudent.faculty = req.query.faculty;
  if (req.query.section) whereStudent.section = req.query.section;

  if (req.user.role === Role.TEACHER) {
    const allowed = await getAllowedClassSetForTeacher(teacherId);
    if (allowed.size === 0) {
      return res.json({
        ok: true,
        periodLabel,
        kpis: { trackedStudents: 0, attendancePercent: 0, dailyPresentCount: 0 },
        classOverview: { averageAttendancePercent: 0, totalPresent: 0, totalAbsent: 0 },
        distribution: [{ name: "Present", value: 0 }, { name: "Absent", value: 0 }],
        trend: [],
        studentPercentages: [],
        lowAttendance: [],
      });
    }

    const requestedClass = req.query.batch && req.query.faculty && req.query.section
      ? classKey({ batch: req.query.batch, faculty: req.query.faculty, section: req.query.section })
      : null;
    if (requestedClass && !allowed.has(requestedClass)) {
      return res.status(403).json({ ok: false, error: "You do not have access to this class" });
    }

    whereStudent.OR = [...allowed].map((key) => {
      const [batch, faculty, section] = key.split("|");
      return { batch, faculty, section };
    });
  }

  const students = await prisma.student.findMany({
    where: whereStudent,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      rollNumber: true,
      batch: true,
      faculty: true,
      section: true,
    },
    orderBy: [{ batch: "asc" }, { faculty: "asc" }, { section: "asc" }, { rollNumber: "asc" }],
  });

  const studentIdSet = new Set(students.map((s) => s.id));

  const attendanceRows = await prisma.attendance.findMany({
    where: {
      date: {
        gte: monthRange.start,
        lt: monthRange.end,
      },
      ...(students.length ? { studentId: { in: [...studentIdSet] } } : { studentId: -1 }),
    },
    select: {
      studentId: true,
      present: true,
      date: true,
    },
    orderBy: { date: "asc" },
  });

  const [totalsByStudent, presentByStudent] = await Promise.all([
    prisma.attendance.groupBy({
      by: ["studentId"],
      where: {
        date: {
          gte: monthRange.start,
          lt: monthRange.end,
        },
        ...(students.length ? { studentId: { in: [...studentIdSet] } } : { studentId: -1 }),
      },
      _count: { _all: true },
    }),
    prisma.attendance.groupBy({
      by: ["studentId"],
      where: {
        present: true,
        date: {
          gte: monthRange.start,
          lt: monthRange.end,
        },
        ...(students.length ? { studentId: { in: [...studentIdSet] } } : { studentId: -1 }),
      },
      _count: { _all: true },
    }),
  ]);

  const totalMap = new Map(totalsByStudent.map((row) => [row.studentId, row._count._all]));
  const presentMap = new Map(presentByStudent.map((row) => [row.studentId, row._count._all]));

  const totalRows = totalsByStudent.reduce((acc, row) => acc + row._count._all, 0);
  const totalPresent = presentByStudent.reduce((acc, row) => acc + row._count._all, 0);

  const studentPercentages = students.map((student) => {
    const total = totalMap.get(student.id) || 0;
    const present = presentMap.get(student.id) || 0;
    const attendancePercent = withPercent(present, total);
    return {
      studentId: student.id,
      name: `${student.firstName} ${student.lastName}`,
      rollNumber: student.rollNumber,
      batch: student.batch,
      faculty: student.faculty,
      section: student.section,
      presentCount: present,
      totalCount: total,
      attendancePercent,
      lowAttendance: attendancePercent < 75,
    };
  });

  const trend = buildTrend(attendanceRows);
  const latestPresentCount = getLatestPresentCount(attendanceRows);

  return res.json({
    ok: true,
    periodLabel,
    kpis: {
      trackedStudents: students.length,
      attendancePercent: withPercent(totalPresent, totalRows),
      dailyPresentCount: latestPresentCount,
    },
    classOverview: {
      averageAttendancePercent: withPercent(totalPresent, totalRows),
      totalPresent,
      totalAbsent: Math.max(totalRows - totalPresent, 0),
    },
    distribution: [
      { name: "Present", value: totalPresent },
      { name: "Absent", value: Math.max(totalRows - totalPresent, 0) },
    ],
    trend,
    studentPercentages,
    lowAttendance: studentPercentages.filter((s) => s.lowAttendance),
  });
});

router.get(["/api/analytics/admin/overview", "/analytics/admin/overview"], requireAuth(Role.ADMIN), async (req, res) => {
  const monthRange = getCurrentMonthRangeUtc();
  const periodLabel = getCurrentMonthLabel();

  const students = await prisma.student.findMany({
    select: {
      id: true,
      batch: true,
      faculty: true,
      section: true,
    },
    orderBy: [{ batch: "asc" }, { faculty: "asc" }, { section: "asc" }, { id: "asc" }],
  });

  const attendanceRows = await prisma.attendance.findMany({
    where: {
      date: {
        gte: monthRange.start,
        lt: monthRange.end,
      },
    },
    select: {
      studentId: true,
      present: true,
      date: true,
    },
    orderBy: { date: "asc" },
  });

  const [totals, totalPresent] = await Promise.all([
    prisma.attendance.aggregate({
      where: {
        date: {
          gte: monthRange.start,
          lt: monthRange.end,
        },
      },
      _count: { _all: true },
    }),
    prisma.attendance.count({
      where: {
        present: true,
        date: {
          gte: monthRange.start,
          lt: monthRange.end,
        },
      },
    }),
  ]);

  const totalRows = totals._count._all;

  const classWise = buildClassSummary(students, attendanceRows);
  const dailyClassView = buildClassSummary(students, attendanceRows, true);
  const trend = buildTrend(attendanceRows);
  const latestPresentCount = getLatestPresentCount(attendanceRows);

  return res.json({
    ok: true,
    periodLabel,
    kpis: {
      totalStudents: students.length,
      attendancePercent: withPercent(totalPresent, totalRows),
      dailyPresentCount: latestPresentCount,
    },
    classWise,
    classWiseDaily: dailyClassView.map((item) => ({
      classKey: item.classKey,
      batch: item.batch,
      faculty: item.faculty,
      section: item.section,
      totalStudents: item.totalStudents,
      presentToday: item.presentToday,
    })),
    trend,
    distribution: [
      { name: "Present", value: totalPresent },
      { name: "Absent", value: Math.max(totalRows - totalPresent, 0) },
    ],
  });
});

module.exports = router;
