const { Router } = require("express");
const { z } = require("zod");
const { prisma } = require("../lib/prisma");
const { ML_SERVICE_URL } = require("../config");
const { requireAuth } = require("../middlewares/auth");
const { validate } = require("../middlewares/validate");
const { AcademicBatch, Faculty, Role, Section } = require("@prisma/client");

const router = Router();

async function computeAbsences(studentId) {
  return prisma.attendance.count({ where: { studentId, present: false } });
}

// Keep encoding consistent with ml-services/data/student.csv (numeric codes)
const JOB_ENCODING = {
  at_home: 0,
  health: 1,
  other: 2,
  services: 3,
  teacher: 4,
};

function encodeJob(job) {
  if (!job) return JOB_ENCODING.other;
  return JOB_ENCODING[job] ?? JOB_ENCODING.other;
}

function toTravelTimeScale(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 2;
  if (n >= 1 && n <= 4) return Math.trunc(n);

  // If travelTime was stored as minutes, bucket to 1..4
  if (n <= 15) return 1;
  if (n <= 30) return 2;
  if (n <= 60) return 3;
  return 4;
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

function buildPredictUrl(base) {
  if (!base) return "";
  const trimmed = String(base).trim().replace(/\/+$/, "");
  if (trimmed.endsWith("/predict")) return trimmed;
  return `${trimmed}/predict`;
}

const predictSchema = z.object({
  body: z.object({
    studentId: z.number().int(),
  }),
});

router.post("/api/predict-grade", requireAuth(), validate(predictSchema), async (req, res) => {
  const { studentId } = req.validated.body;
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) return res.status(404).json({ ok: false, error: "Student not found" });

  const latestMark = await prisma.mark.findFirst({
    where: { studentId },
    orderBy: { createdAt: "desc" },
  });
  if (!latestMark) return res.status(400).json({ ok: false, error: "No marks found for student" });

  const absences = await computeAbsences(studentId);

  // Required 7 features (strict keys)
  const features = {
    G1: latestMark.g1,
    G2: latestMark.g2,
    absences,
    extracurricular: latestMark.activities ? 1 : 0,
    Mjob: encodeJob(student.motherJob),
    Fjob: encodeJob(student.fatherJob),
    traveltime: toTravelTimeScale(student.travelTime),
  };

  let predictedLetter = numericToLetter(latestMark.g2);
  let confidence = null;

  const predictUrl = buildPredictUrl(ML_SERVICE_URL);
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
        predictedLetter = String(data.predicted_grade);
      }
      if (data?.confidence !== undefined && data?.confidence !== null) {
        confidence = Number(data.confidence);
      }
    } catch (err) {
      console.error("Prediction error", err.message);
    }
  }

  const storedCode = letterToCode(predictedLetter);

  const payload = {
    features,
    predicted_grade: predictedLetter,
    confidence,
    source: predictUrl ? "ml-service" : "fallback",
  };

  const prediction = await prisma.prediction.create({
    data: {
      studentId,
      predictedGrade: storedCode,
      payload,
    },
  });

  return res.json({ ok: true, predicted_grade: predictedLetter, confidence, prediction });
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
