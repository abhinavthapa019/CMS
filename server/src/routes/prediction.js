const { Router } = require("express");
const { z } = require("zod");
const { prisma } = require("../lib/prisma");
const { ML_SERVICE_URL } = require("../config");
const { requireAuth } = require("../middlewares/auth");
const { validate } = require("../middlewares/validate");
const { AcademicBatch, Faculty, Role, Section } = require("@prisma/client");

const router = Router();

async function computeAbsenceSignal(student) {
  const [totalRows, absenceRows] = await Promise.all([
    prisma.attendance.count({ where: { studentId: student.id } }),
    prisma.attendance.count({ where: { studentId: student.id, present: false } }),
  ]);

  if (totalRows > 0) {
    return { absences: absenceRows, source: "student" };
  }

  // If the student has no attendance rows yet, treat it as a high-absence signal for demo clarity.
  if (totalRows === 0) {
    return { absences: 25, source: "missing" };
  }

  const classStudents = await prisma.student.findMany({
    where: { batch: student.batch, faculty: student.faculty, section: student.section },
    select: { id: true },
  });

  if (classStudents.length === 0) {
    return { absences: 3, source: "default" };
  }

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const classAbsences = await prisma.attendance.count({
    where: {
      studentId: { in: classStudents.map((s) => s.id) },
      present: false,
      date: { gte: since },
    },
  });

  const avgAbsences = Math.round(classAbsences / classStudents.length) || 3;
  return { absences: avgAbsences, source: "class-average" };
}

function numericToLetter(gradeNum) {
  const n = Number(gradeNum);
  if (!Number.isFinite(n)) return "C";
  if (n >= 16) return "A";
  if (n >= 13) return "B";
  if (n >= 10) return "C";
  if (n >= 7) return "D";
  return "F";
}


function letterToCode(letter) {
  const l = String(letter || "").toUpperCase();
  if (l === "A") return 4;
  if (l === "B") return 3;
  if (l === "C") return 2;
  if (l === "D") return 1;
  return 0;
}

function codeToLetter(code) {
  const n = Number(code);
  if (n === 4) return "A";
  if (n === 3) return "B";
  if (n === 2) return "C";
  if (n === 1) return "D";
  return "F";
}

function capForAttendance(letter, absenceSignal, absences) {
  const l = String(letter || "").toUpperCase();
  if (absenceSignal !== "student") {
    if (l === "A" || l === "B") return "C";
    return l;
  }
  if (Number(absences) >= 10 && l === "A") return "B";
  return l;
}

function toTravelTimeScale(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 2;
  if (n >= 1 && n <= 4) return Math.trunc(n);
  if (n <= 15) return 1;
  if (n <= 30) return 2;
  if (n <= 60) return 3;
  return 4;
}


function buildPredictUrl(base) {
  if (!base) return "";
  const trimmed = String(base).trim().replace(/\/+$/, "");
  if (trimmed.endsWith("/predict")) return trimmed;
  return `${trimmed}/predict`;
}

const predictSchema = z.object({
  body: z.object({
    studentId: z.number().int(),
    subjectId: z.number().int().positive().optional(),
  }),
});

router.post("/api/predict-grade", requireAuth(), validate(predictSchema), async (req, res) => {
  const { studentId, subjectId } = req.validated.body;
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) return res.status(404).json({ ok: false, error: "Student not found" });

  let g1 = null;
  let g2 = null;
  let subjectContext = null;
  let activitiesFlag = false;

  if (req.user.role === Role.TEACHER) {
    if (!subjectId) {
      return res.status(400).json({ ok: false, error: "subjectId is required for teacher predictions" });
    }
    const mark = await prisma.mark.findFirst({
      where: { studentId, subjectId },
      orderBy: { createdAt: "desc" },
      select: { g1: true, g2: true, activities: true, subject: { select: { id: true, name: true } } },
    });
    if (!mark) return res.status(400).json({ ok: false, error: "No marks found for this subject" });
    g1 = mark.g1;
    g2 = mark.g2;
    subjectContext = mark.subject;
    activitiesFlag = !!mark.activities;
  } else if (req.user.role === Role.ADMIN) {
    const rows = await prisma.mark.findMany({
      where: { studentId },
      select: { g1: true, g2: true, activities: true },
    });
    if (rows.length === 0) return res.status(400).json({ ok: false, error: "No marks found for student" });
    const g1Values = rows.map((r) => Number(r.g1)).filter((n) => Number.isFinite(n));
    const g2Values = rows.map((r) => Number(r.g2)).filter((n) => Number.isFinite(n));
    if (!g1Values.length || !g2Values.length) {
      return res.status(400).json({ ok: false, error: "No G1/G2 marks found for student" });
    }
    g1 = g1Values.reduce((sum, n) => sum + n, 0) / g1Values.length;
    g2 = g2Values.reduce((sum, n) => sum + n, 0) / g2Values.length;
    activitiesFlag = rows.some((r) => r.activities);
  } else {
    return res.status(403).json({ ok: false, error: "Forbidden" });
  }

  if (!Number.isFinite(Number(g1)) || !Number.isFinite(Number(g2))) {
    return res.status(400).json({ ok: false, error: "Invalid G1/G2 marks" });
  }

  const absenceSignal = await computeAbsenceSignal(student);
  const absences = absenceSignal.absences;

  const features = {
    G1: Math.max(0, Math.min(20, Number(g1))),
    G2: Math.max(0, Math.min(20, Number(g2))),
    grade_8_score: Math.max(0, Math.min(20, Number(student.grade8Score || 0) / 5)),
    grade_9_score: Math.max(0, Math.min(20, Number(student.grade9Score || 0) / 5)),
    grade_10_score: Math.max(0, Math.min(20, Number(student.grade10Score || 0) / 5)),
    traveltime: toTravelTimeScale(student.travelTime),
    absences: Math.max(0, Math.min(93, Number(absences) || 0)),
    Mjob: student.motherJob || "other",
    Fjob: student.fatherJob || "other",
    activities: activitiesFlag ? "yes" : "no",
  };

  const fallbackScore = Math.max(0, Math.min(100, ((Number(g1) + Number(g2)) / 2) * 5));
  let predictedLetter = numericToLetter(fallbackScore / 5);
  let predictedScore = null;

  const predictUrl = buildPredictUrl(ML_SERVICE_URL);
  let source = "fallback";
  if (predictUrl) {
    try {
      const response = await fetch(predictUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(features),
      });
      if (!response.ok) throw new Error(`ML service error: ${response.status}`);
      const data = await response.json();
      if (data?.predicted_grade !== undefined) {
        if (typeof data.predicted_grade === "number") {
          predictedScore = data.predicted_grade;
          predictedLetter = numericToLetter(predictedScore / 5);
          source = "ml-service";
        } else {
          predictedLetter = String(data.predicted_grade);
          source = "ml-service";
        }
      }
    } catch (err) {
      console.error("Prediction error", err.message);
    }
  }

  if (predictedScore === null) {
    predictedScore = fallbackScore;
  }

  predictedLetter = capForAttendance(predictedLetter, absenceSignal.source, absences);

  const storedCode = letterToCode(predictedLetter);

  const payload = {
    features,
    predicted_grade: predictedLetter,
    predicted_score: predictedScore,
    subject: subjectContext,
    source,
    absence_source: absenceSignal.source,
  };

  const prediction = await prisma.prediction.create({
    data: {
      studentId,
      predictedGrade: storedCode,
      payload,
    },
  });

  return res.json({ ok: true, predicted_grade: predictedLetter, predicted_score: predictedScore, prediction });
});

// Admin: view latest predictions across students (optionally filter by class)
router.get("/api/predictions/admin", requireAuth(Role.ADMIN), async (req, res) => {
  try {
    const batch = req.query.batch ? String(req.query.batch) : "";
    const faculty = req.query.faculty ? String(req.query.faculty) : "";
    const section = req.query.section ? String(req.query.section) : "";

    const validBatch = batch ? Object.values(AcademicBatch).includes(batch) : true;
    const validFaculty = faculty ? Object.values(Faculty).includes(faculty) : true;
    const validSection = section ? Object.values(Section).includes(section) : true;
    if (!validBatch || !validFaculty || !validSection) {
      return res.status(400).json({ ok: false, error: "Invalid class filter values" });
    }

    const whereStudent = {};
    if (batch) whereStudent.batch = batch;
    if (faculty) whereStudent.faculty = faculty;
    if (section) whereStudent.section = section;

    const predictions = await prisma.prediction.findMany({
      where: {
        student: Object.keys(whereStudent).length ? whereStudent : undefined,
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 5000,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            rollNumber: true,
            batch: true,
            faculty: true,
            section: true,
          },
        },
      },
    });

    // Keep only the latest prediction per student
    const latestByStudent = new Map();
    for (const p of predictions) {
      if (!p.studentId) continue;
      if (!latestByStudent.has(p.studentId)) {
        latestByStudent.set(p.studentId, p);
      }
    }

    const payload = [...latestByStudent.values()].map((p) => {
      const predictedGrade = p.payload?.predicted_grade ? String(p.payload.predicted_grade) : codeToLetter(p.predictedGrade);
      const confidence = p.payload?.confidence ?? null;
      return {
        id: p.id,
        studentId: p.studentId,
        student: p.student,
        predictedGrade,
        confidence: typeof confidence === "number" && Number.isFinite(confidence) ? confidence : null,
        createdAt: p.createdAt,
      };
    });

    const grades = ["A", "B", "C", "D", "F"];
    const counts = Object.fromEntries(grades.map((g) => [g, 0]));
    const confs = [];
    for (const row of payload) {
      const g = String(row.predictedGrade || "").toUpperCase();
      if (counts[g] !== undefined) counts[g] += 1;
      if (typeof row.confidence === "number") confs.push(row.confidence);
    }

    const avgConfidence = confs.length ? confs.reduce((a, b) => a + b, 0) / confs.length : null;

    return res.json({
      ok: true,
      predictions: payload,
      distribution: grades.map((g) => ({ grade: g, count: counts[g] })),
      avgConfidence,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: "Failed to fetch predictions" });
  }
});

module.exports = router;
