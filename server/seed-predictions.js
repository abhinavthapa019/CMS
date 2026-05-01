const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function randFloat(min, max) {
  return min + Math.random() * (max - min);
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
  if (n <= 15) return 1;
  if (n <= 30) return 2;
  if (n <= 60) return 3;
  return 4;
}

async function run() {
  const students = await prisma.student.findMany({
    select: {
      id: true,
      motherJob: true,
      fatherJob: true,
      travelTime: true,
    },
    orderBy: [{ id: "asc" }],
  });

  if (students.length === 0) {
    throw new Error("No students found. Run seed-students first.");
  }

  const marks = await prisma.mark.findMany({
    select: { studentId: true, g1: true, g2: true, activities: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });

  const latestMarkByStudent = new Map();
  for (const m of marks) {
    if (!latestMarkByStudent.has(m.studentId)) {
      latestMarkByStudent.set(m.studentId, m);
    }
  }

  if (latestMarkByStudent.size === 0) {
    throw new Error("No marks found. Run seed-marks first.");
  }

  const absences = await prisma.attendance.groupBy({
    by: ["studentId"],
    where: { present: false },
    _count: { _all: true },
  });
  const absencesByStudent = new Map(absences.map((r) => [r.studentId, r._count._all]));

  await prisma.prediction.deleteMany();

  let created = 0;

  for (const s of students) {
    const mark = latestMarkByStudent.get(s.id);
    if (!mark) continue;

    const predictedLetter = numericToLetter(mark.g2);
    const storedCode = letterToCode(predictedLetter);

    const features = {
      G1: mark.g1,
      G2: mark.g2,
      absences: absencesByStudent.get(s.id) || 0,
      extracurricular: mark.activities ? 1 : 0,
      Mjob: encodeJob(s.motherJob),
      Fjob: encodeJob(s.fatherJob),
      traveltime: toTravelTimeScale(s.travelTime),
    };

    const confidence = Number(randFloat(0.6, 0.95).toFixed(4));

    await prisma.prediction.create({
      data: {
        studentId: s.id,
        predictedGrade: storedCode,
        payload: {
          features,
          predicted_grade: predictedLetter,
          confidence,
          source: "seed",
        },
      },
    });

    created += 1;
  }

  console.log(`Seeded predictions for ${created} students (latest per student).`);
}

run()
  .catch((err) => {
    console.error("ERROR", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
