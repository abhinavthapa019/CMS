const { Router } = require("express");
const { z } = require("zod");
const { prisma } = require("../lib/prisma");
const { ML_SERVICE_URL } = require("../config");
const { requireAuth } = require("../middlewares/auth");
const { validate } = require("../middlewares/validate");

const router = Router();

async function computeAttendancePercent(studentId) {
  const total = await prisma.attendance.count({ where: { studentId } });
  if (total === 0) return 0;
  const present = await prisma.attendance.count({ where: { studentId, present: true } });
  return Math.round((present / total) * 100);
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

  const attendancePercent = await computeAttendancePercent(studentId);

  const payload = {
    G1: latestMark.g1,
    G2: latestMark.g2,
    travel_time: student.travelTime,
    father_job: student.fatherJob,
    mother_job: student.motherJob,
    attendance: attendancePercent,
    activities: latestMark.activities ? 1 : 0,
  };

  let predicted = latestMark.g2;

  if (ML_SERVICE_URL) {
    try {
      const response = await fetch(ML_SERVICE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`ML service error: ${response.status}`);
      const data = await response.json();
      if (data.predicted_grade !== undefined) {
        predicted = data.predicted_grade;
      }
    } catch (err) {
      console.error("Prediction error", err.message);
    }
  }

  const prediction = await prisma.prediction.create({
    data: {
      studentId,
      predictedGrade: predicted,
      payload,
    },
  });

  return res.json({ ok: true, predicted_grade: predicted, prediction });
});

module.exports = router;
