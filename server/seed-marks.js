const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function classKey(row) {
  return `${row.batch}|${row.faculty}|${row.section}`;
}

function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function gaussianLikeNoise() {
  return (Math.random() + Math.random() + Math.random() - 1.5) * 10;
}

function sampleFinalScore({ g1, g2, g3, subjectOffset = 0 }) {
  const avg = (Number(g1) + Number(g2) + Number(g3)) / 3;

  let baseline = avg + subjectOffset;
  const tierRoll = Math.random();
  if (tierRoll < 0.12) baseline -= randInt(15, 28);
  else if (tierRoll > 0.88) baseline += randInt(10, 18);

  let noise = gaussianLikeNoise();
  noise += randInt(-12, 12);
  noise = clamp(noise, -15, 15);

  const extremeLow = avg <= 35;
  const extremeHigh = avg >= 85;
  if (extremeLow && Math.random() < 0.92) {
    baseline = Math.min(baseline, 58);
  }
  if (extremeHigh && Math.random() < 0.92) {
    baseline = Math.max(baseline, 62);
  }

  const finalScore = clamp(Math.round(baseline + noise), 0, 100);
  return finalScore;
}

async function run() {
  const students = await prisma.student.findMany({
    select: {
      id: true,
      batch: true,
      faculty: true,
      section: true,
      grade8Score: true,
      grade9Score: true,
      grade10Score: true,
    },
    orderBy: [{ id: "asc" }],
  });

  if (students.length === 0) {
    throw new Error("No students found. Run seed-students first.");
  }

  const classTeacherAssignments = await prisma.classTeacherAssignment.findMany({
    select: { teacherId: true, batch: true, faculty: true, section: true },
  });

  const teacherFallback = await prisma.user.findFirst({
    where: { role: "TEACHER" },
    select: { id: true },
    orderBy: [{ id: "asc" }],
  });

  if (!teacherFallback) {
    throw new Error("No TEACHER users found. Run seed-teachers first.");
  }

  const teacherByClass = new Map();
  for (const a of classTeacherAssignments) {
    teacherByClass.set(classKey(a), a.teacherId);
  }

  const subjects = await prisma.subject.findMany({
    select: { id: true, name: true, faculty: true, isOptional: true },
  });

  if (subjects.length === 0) {
    throw new Error("No subjects found. Run seed-subjects first.");
  }

  await prisma.mark.deleteMany();

  const rows = [];

  for (const s of students) {
    const teacherId = teacherByClass.get(classKey(s)) || teacherFallback.id;
    const grade8 = Number(s.grade8Score || 0);
    const grade9 = Number(s.grade9Score || 0);
    const grade10 = Number(s.grade10Score || 0);

    const eligibleSubjects = subjects.filter((subj) => subj.faculty === s.faculty);
    for (const subject of eligibleSubjects) {
      if (subject.isOptional && Math.random() < 0.35) {
        continue;
      }

      const subjectOffset = subject.name === "Mathematics"
        ? randInt(-6, 6)
        : subject.name === "English"
          ? randInt(-4, 6)
          : subject.name === "Physics" || subject.name === "Chemistry"
            ? randInt(-8, 5)
            : randInt(-5, 5);

      const g1 = clamp(Math.round(grade9 / 5 + randInt(-2, 2)), 0, 20);
      const g2 = clamp(Math.round(grade10 / 5 + randInt(-1, 1)), 0, 20);
      const marks = sampleFinalScore({ g1: grade8, g2: grade9, g3: grade10, subjectOffset });
      const activities = Math.random() < 0.35;
      rows.push({
        studentId: s.id,
        subjectId: subject.id,
        teacherId,
        g1,
        g2,
        activities,
        marks,
      });
    }
  }

  await prisma.mark.createMany({ data: rows });

  console.log(`Seeded subject-wise marks for ${rows.length} entries.`);
}

run()
  .catch((err) => {
    console.error("ERROR", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
